/**
 * Alta y edición de servicios — casos de uso del módulo Operación.
 *
 * Mismo cálculo y mismo orden que `ServiceService.createService` y
 * `updateServicio`: prepago, habitación, alta, disponibilidad, conflictos,
 * comisiones, detalles, clientes y caja, todo en una sola unidad con
 * `ContextoOperacion`. El aviso a los temporizadores sale después del commit.
 */
import { enUnaUnidad, type ContextoOperacion } from '@/lib/transaccion/contrato';
import { ejecutarEfectosConfirmados } from '@/lib/transaccion/efectos';
import { generateUUID } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { ServiceCreateSchema } from '@/lib/business/schemas';
import { BusinessError } from '@/lib/errors/errors';
import {
  parsePagosMixtos,
  validatePagosMixtos,
  calcularDeltasCaja,
  type MixedPayment
} from '@/lib/business/pagosMixtos';
import { sendNotificationToAll } from '@/lib/api/sseService';
import type { z } from 'zod';
import {
  leerHabitacionParaServicio,
  insertarServicio,
  insertarDetallesServicio,
  reemplazarDetallesServicio,
  insertarClientesServicio,
  actualizarCamposServicio,
  leerIvaServicio
} from './repositorio';
import { obtenerCajaActiva, registrarMovimientoCobro, ajustarIvaCaja } from '@/modules/caja';
import { consumirPrepagoVenta } from '@/modules/clientes';
import { registrarComisionesServicio } from '@/modules/personal';
import { validarAnfitrionasEnLocal } from '@/modules/identidad';
import { ocuparHabitacionVenta, pausarConflictosServicio } from '../facturacion/servicio';

type Tarea = () => void | Promise<void>;
type EntradaServicio = z.input<typeof ServiceCreateSchema>;

export async function crearServicioEnUnidad(
  body: EntradaServicio,
  creadoPor: string,
  contexto: ContextoOperacion,
  aplazar: (tarea: Tarea) => void
): Promise<{ id: string; codigo: string; tiempo: number | undefined; total: number }> {
  const v = ServiceCreateSchema.parse(body);
  const servicioId = generateUUID();
  const codigo = Math.random().toString(36).substring(2, 10).toUpperCase();
  const now = getNowInBusinessTimezone(v.device_date);
  const pagosMixtos: MixedPayment[] = parsePagosMixtos(v.pagos_mixtos);

  const cajaId = await obtenerCajaActiva(contexto);

  let prepagoMonto = 0;
  const numAnfitrionas = Math.max(1, v.usuarios.length);
  const precioServicioInput = Number(v.precio_servicio || 0);
  const esMixto = v.metodo_pago === 'mixto';
  const prepagoSolicitado = esMixto
    ? pagosMixtos
        .filter(pago => pago.metodo === 'prepago')
        .reduce((sum, pago) => sum + pago.monto, 0)
    : null;

  if (esMixto) {
    validatePagosMixtos(pagosMixtos, Number(v.total || 0));
  }

  if (v.cliente_id) {
    prepagoMonto = await consumirPrepagoVenta(
      {
        clienteId: v.cliente_id,
        total: Number(v.total || 0),
        prepagoSolicitado,
        ventaId: servicioId,
        createdBy: creadoPor,
        now,
        codigo,
        concepto: `Pago servicio ${codigo}`
      },
      contexto
    );
  }

  let esLibreIngreso = false;
  let comisionHabitacion = 0;
  if (v.habitacion_id) {
    const habitacion = await leerHabitacionParaServicio(v.habitacion_id, contexto);
    if (habitacion) {
      const roomPrice = Number(habitacion.precio || 0);
      const roomCommission = Number(habitacion.comision_anfitriona || 0);
      comisionHabitacion = roomCommission;
      esLibreIngreso = roomPrice <= 0 || roomCommission <= 0;
    }
  }

  const tieneComisionHabitacion = comisionHabitacion > 0;
  const comisionIndividualBase = tieneComisionHabitacion
    ? Math.floor(comisionHabitacion / numAnfitrionas)
    : precioServicioInput;
  const comisionTotal = tieneComisionHabitacion
    ? comisionHabitacion
    : precioServicioInput * numAnfitrionas;

  await insertarServicio(
    {
      id_servicio: servicioId,
      codigo,
      cliente_id: v.cliente_id || null,
      habitacion_id: v.habitacion_id,
      precio_habitacion: v.precio_habitacion,
      precio_servicio: v.precio_servicio,
      iva: v.iva,
      sub_total: v.sub_total,
      total: v.total,
      tiempo: v.tiempo,
      metodo_pago: v.metodo_pago,
      caja_id: cajaId,
      created_by: creadoPor,
      estado: esLibreIngreso && (!v.tiempo || v.tiempo <= 0) ? 1 : 2,
      es_temporal: v.es_temporal ? 1 : 0,
      servicio_original_id: v.servicio_original_id || null,
      fecha_crea: now,
      pagos_mixtos: v.pagos_mixtos ? JSON.stringify(v.pagos_mixtos) : null
    },
    contexto
  );

  if (v.habitacion_id && !esLibreIngreso) {
    await ocuparHabitacionVenta(v.habitacion_id, contexto);
  }

  const hostessIds = await validarAnfitrionasEnLocal(v.usuarios, contexto);
  if (hostessIds.length !== v.usuarios.length) {
    throw new BusinessError(
      'Hay anfitrionas seleccionadas que no estan logueadas en el local',
      'HOSTESS_NOT_LOGGED_IN'
    );
  }

  await pausarConflictosServicio(hostessIds, servicioId, contexto);

  const commissionId = generateUUID();
  const remainder = tieneComisionHabitacion ? comisionTotal % numAnfitrionas : 0;

  const detalleComisionRows: Array<{
    id_detalle_comision: string;
    comision_id: string;
    usuario_id: string;
    comision: number;
    estado: number;
    fecha_crea: string;
  }> = [];
  const detalleServicioRows: Array<{
    id_detalle_servicio: string;
    usuario_id: string;
    servicio_id: string;
    comision: number;
    fecha_crea: string;
  }> = [];

  for (const [index, uId] of hostessIds.entries()) {
    const comisionIndividual = comisionIndividualBase + (index === 0 ? remainder : 0);
    detalleComisionRows.push({
      id_detalle_comision: generateUUID(),
      comision_id: commissionId,
      usuario_id: uId,
      comision: comisionIndividual,
      estado: 1,
      fecha_crea: now
    });
    detalleServicioRows.push({
      id_detalle_servicio: generateUUID(),
      usuario_id: uId,
      servicio_id: servicioId,
      comision: comisionIndividual,
      fecha_crea: now
    });
  }

  if (detalleComisionRows.length > 0) {
    await registrarComisionesServicio(
      [
        {
          id_comision: commissionId,
          servicio_id: servicioId,
          monto: comisionTotal,
          estado: 1,
          fecha_crea: now
        }
      ],
      detalleComisionRows,
      contexto
    );
  }
  if (detalleServicioRows.length > 0) {
    await insertarDetallesServicio(detalleServicioRows, contexto);
  }

  const clientesArray =
    v.clientes && v.clientes.length > 0 ? v.clientes : v.cliente_id ? [v.cliente_id] : [];
  await insertarClientesServicio(servicioId, clientesArray.filter(Boolean) as string[], contexto);

  if (cajaId) {
    if (esMixto) {
      const deltas = calcularDeltasCaja(pagosMixtos);
      await registrarMovimientoCobro(
        cajaId,
        {
          servicio: Number(v.total) - Number(v.iva || 0),
          efectivo: deltas.efectivo,
          tarjeta: deltas.tarjeta,
          transferencia: deltas.transferencia,
          prepago: prepagoMonto,
          iva: v.iva,
          comision: comisionTotal
        },
        contexto
      );
    } else {
      const montoMetodoPrincipal = Number(v.total) - prepagoMonto;
      await registrarMovimientoCobro(
        cajaId,
        {
          servicio: Number(v.total) - Number(v.iva || 0),
          efectivo: v.metodo_pago === 'efectivo' ? montoMetodoPrincipal : 0,
          tarjeta: v.metodo_pago === 'tarjeta' ? montoMetodoPrincipal : 0,
          transferencia: v.metodo_pago === 'transferencia' ? montoMetodoPrincipal : 0,
          prepago: prepagoMonto,
          iva: v.iva,
          comision: comisionTotal
        },
        contexto
      );
    }
  }

  aplazar(() => {
    sendNotificationToAll('timers_updated', { timestamp: now });
  });

  return { id: servicioId, codigo, tiempo: v.tiempo, total: v.total };
}

export async function crearServicio(
  body: EntradaServicio,
  creadoPor: string
): Promise<{ id: string; codigo: string; tiempo: number | undefined; total: number }> {
  const tareas: Tarea[] = [];
  const aplazar = (tarea: Tarea) => tareas.push(tarea);
  const resultado = await enUnaUnidad(unidad =>
    unidad.ejecutar(contexto => crearServicioEnUnidad(body, creadoPor, contexto, aplazar))
  );
  await ejecutarEfectosConfirmados(tareas);
  return resultado;
}

export async function actualizarServicio(
  id: string,
  body: Partial<EntradaServicio>,
  contexto: ContextoOperacion
): Promise<void> {
  const validated = ServiceCreateSchema.partial().parse(body);
  const ivaPrevio = await leerIvaServicio(id, contexto);
  const ivaDelta = Number(validated.iva || 0) - Number(ivaPrevio || 0);
  const now = getNowInBusinessTimezone(validated.device_date);

  await actualizarCamposServicio(
    id,
    {
      cliente_id: validated.cliente_id || null,
      habitacion_id: validated.habitacion_id,
      precio_habitacion: validated.precio_habitacion || 0,
      precio_servicio: validated.precio_servicio,
      iva: validated.iva || 0,
      sub_total: validated.sub_total,
      total: validated.total,
      tiempo: validated.tiempo,
      fecha_mod: now
    },
    contexto
  );

  if (ivaDelta !== 0) {
    await ajustarIvaCaja(ivaDelta, contexto);
  }

  if (validated.usuarios && validated.usuarios.length > 0) {
    await reemplazarDetallesServicio(id, validated.usuarios, contexto);
  }
}

export async function actualizarServicioCasoUso(
  id: string,
  body: Partial<EntradaServicio>
): Promise<void> {
  await enUnaUnidad(unidad => unidad.ejecutar(contexto => actualizarServicio(id, body, contexto)));
}
