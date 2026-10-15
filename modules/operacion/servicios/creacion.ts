/**
 * Alta y edición de servicios — casos de uso del módulo Operación.
 *
 * Mismo cálculo y mismo orden que `ServiceService.createService` y
 * `updateServicio`: prepago, habitación, alta, disponibilidad, conflictos,
 * comisiones, detalles, clientes y caja, todo en una sola unidad con
 * `ContextoOperacion`. El aviso a los temporizadores sale después del commit.
 */
import { cambiarAnfitrionasServicioEnUnidad, obtenerServicioParaConsumo } from './asignaciones';
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
  validarHabitacionDisponibleParaServicio,
  marcarPausaServicio,
  leerAdicionalActivo,
  insertarServicio,
  insertarDetallesServicio,
  insertarClientesServicio,
  actualizarCamposServicio,
  leerIvaServicio
} from './repositorio';
import { obtenerCajaActiva, registrarMovimientoCobro, ajustarIvaCaja } from '@/modules/caja';
import { consumirPrepagoVenta, saldoPrepagoAgotado } from '@/modules/clientes';
import { cerrarCuentasPrepagoSaldadas } from '../cuentas/servicio';
import { registrarComisionesServicio } from '@/modules/personal';
import { consumirStockBar } from '@/modules/inventario';
import {
  validarAnfitrionasEnLocal,
  ocuparAnfitrionasServicio,
  comprobarAnfitrionasLibresParaServicio
} from '@/modules/identidad';
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
  if (v.es_temporal) {
    if (!v.servicio_original_id) {
      throw new BusinessError('Selecciona el servicio original para crear el adicional');
    }
    const original = await obtenerServicioParaConsumo(v.servicio_original_id, contexto);
    if (Number(original.es_temporal) === 1)
      throw new BusinessError('Crea el adicional desde el servicio principal');
    if (String(original.habitacion_id) !== String(v.habitacion_id)) {
      throw new BusinessError(
        'El servicio adicional debe usar la habitación del servicio original'
      );
    }
    if (await leerAdicionalActivo(v.servicio_original_id, contexto)) {
      throw new BusinessError(
        'Este servicio ya tiene un adicional activo',
        'TEMPORARY_SERVICE_ACTIVE'
      );
    }
    if (Number(original.estado) === 2) await marcarPausaServicio(v.servicio_original_id, contexto);
    await cambiarAnfitrionasServicioEnUnidad(v.servicio_original_id, v.usuarios, contexto);
  }
  const servicioId = generateUUID();
  const codigo = Math.random().toString(36).substring(2, 10).toUpperCase();
  const now = getNowInBusinessTimezone();
  const pagosMixtos: MixedPayment[] = parsePagosMixtos(v.pagos_mixtos);
  const habitacion = v.habitacion_id
    ? await validarHabitacionDisponibleParaServicio(
        v.habitacion_id,
        contexto,
        v.es_temporal ? v.servicio_original_id! : undefined
      )
    : null;
  await comprobarAnfitrionasLibresParaServicio(
    v.usuarios,
    contexto,
    v.es_temporal ? v.servicio_original_id! : undefined
  );

  const cajaId = await obtenerCajaActiva(contexto);
  if (!cajaId)
    throw new BusinessError('Abre una caja antes de registrar un servicio', 'CASH_REGISTER_CLOSED');

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

  if (v.cliente_id && prepagoMonto > 0 && (await saldoPrepagoAgotado(v.cliente_id, contexto))) {
    await cerrarCuentasPrepagoSaldadas(v.cliente_id, contexto);
  }
  let esLibreIngreso = false;
  let comisionHabitacion = 0;
  if (habitacion) {
    const roomPrice = Number(habitacion.precio || 0);
    const roomCommission = Number(habitacion.comision_anfitriona || 0);
    comisionHabitacion = roomCommission;
    esLibreIngreso = roomPrice <= 0 || roomCommission <= 0;
  }

  const tieneComisionHabitacion = comisionHabitacion > 0 && !v.es_temporal;
  const requiereProducto = tieneComisionHabitacion && !v.es_temporal;
  if (requiereProducto && !v.producto_incluido_presentacion_id) {
    throw new BusinessError(
      'Selecciona el producto incluido en la habitación',
      'INCLUDED_PRODUCT_REQUIRED'
    );
  }
  if (!requiereProducto && v.producto_incluido_presentacion_id) {
    throw new BusinessError('Esta habitación o extensión no incluye un producto');
  }
  const comisionIndividualBase = tieneComisionHabitacion
    ? Math.floor(comisionHabitacion / numAnfitrionas)
    : v.es_temporal
      ? Math.floor(precioServicioInput / numAnfitrionas)
      : precioServicioInput;
  const comisionTotal = tieneComisionHabitacion
    ? comisionHabitacion
    : v.es_temporal
      ? precioServicioInput
      : precioServicioInput * numAnfitrionas;

  await insertarServicio(
    {
      id_servicio: servicioId,
      codigo,
      producto_incluido_presentacion_id: requiereProducto
        ? v.producto_incluido_presentacion_id
        : null,
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

  if (requiereProducto) {
    await consumirStockBar(
      [
        {
          presentacion_id: v.producto_incluido_presentacion_id!,
          cantidad: 1,
          tipo_venta: 'botella'
        }
      ],
      { servicioId, usuarioId: creadoPor, fecha: now },
      contexto
    );
  }

  if (v.habitacion_id && (!esLibreIngreso || Number(v.tiempo) > 0)) {
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
  const remainder = tieneComisionHabitacion || v.es_temporal ? comisionTotal % numAnfitrionas : 0;

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
    if (!(esLibreIngreso && (!v.tiempo || v.tiempo <= 0)))
      await ocuparAnfitrionasServicio(hostessIds, contexto);
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
  const ivaDelta = Object.prototype.hasOwnProperty.call(body, 'iva')
    ? Number(validated.iva || 0) - Number(ivaPrevio || 0)
    : 0;
  const now = getNowInBusinessTimezone();

  await actualizarCamposServicio(
    id,
    {
      ...Object.fromEntries(
        [
          'cliente_id',
          'habitacion_id',
          'precio_habitacion',
          'precio_servicio',
          'iva',
          'sub_total',
          'total',
          'tiempo'
        ]
          .filter(key => Object.prototype.hasOwnProperty.call(body, key))
          .map(key => [key, validated[key as keyof typeof validated]])
      ),
      fecha_mod: now
    },
    contexto
  );

  if (ivaDelta !== 0) {
    await ajustarIvaCaja(ivaDelta, contexto);
  }

  if (body.usuarios !== undefined && validated.usuarios) {
    await cambiarAnfitrionasServicioEnUnidad(id, validated.usuarios, contexto);
  }
}

export async function actualizarServicioCasoUso(
  id: string,
  body: Partial<EntradaServicio>
): Promise<void> {
  await enUnaUnidad(unidad => unidad.ejecutar(contexto => actualizarServicio(id, body, contexto)));
}
