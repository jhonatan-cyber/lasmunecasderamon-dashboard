import { BusinessError, NotFoundError } from '@/lib/errors/errors';
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
import {
  validarReferenciaAdicional,
  validarServicioOriginal,
  validarAdicionalDisponible,
  validarCajaServicio,
  calcularCondicionesServicio,
  calcularEstadoServicio,
  prepararDetallesServicio,
  obtenerClientesServicio,
  calcularMovimientoCajaServicio
} from './reglasCreacion';
import { validarAnfitrionasConfirmadas } from '@/lib/business/registroOperacion';
import {
  parsePagosMixtos,
  prepararPagoRegistro,
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
  leerImportesServicio
} from './repositorio';
import { obtenerCajaActiva, registrarMovimientoCobro } from '@/modules/caja';
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
    const originalId = validarReferenciaAdicional(v.servicio_original_id);
    const original = await obtenerServicioParaConsumo(originalId, contexto);
    validarServicioOriginal(original, v.habitacion_id);
    validarAdicionalDisponible(await leerAdicionalActivo(originalId, contexto));
    if (Number(original.estado) === 2) await marcarPausaServicio(originalId, contexto);
    await cambiarAnfitrionasServicioEnUnidad(originalId, v.usuarios, contexto);
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
  validarCajaServicio(cajaId);

  let prepagoMonto = 0;
  const { prepagoSolicitado } = prepararPagoRegistro(
    v.metodo_pago,
    Number(v.total || 0),
    pagosMixtos
  );

  // Los destinos explícitos permiten repartir el descuento entre varios clientes
  // (el cliente con cuenta, otro o ambos — mitad y mitad). Cada monto se valida
  // contra el saldo real del cliente, con FOR UPDATE, dentro de la unidad.
  const clientesServicio = obtenerClientesServicio(v);
  const destinosPrepago = (v.prepago_destinos ?? []).filter(
    destino => destino.cliente_id && Math.round(Number(destino.monto || 0)) > 0
  );
  for (const destino of destinosPrepago) {
    if (!clientesServicio.includes(destino.cliente_id)) {
      throw new BusinessError(
        'El descuento de saldo solo puede aplicarse a clientes del servicio',
        'PREPAGO_DESTINO_INVALIDO'
      );
    }
  }

  if (destinosPrepago.length > 0) {
    for (const destino of destinosPrepago) {
      prepagoMonto += await consumirPrepagoVenta(
        {
          clienteId: destino.cliente_id,
          total: Number(v.total || 0),
          prepagoSolicitado: Math.round(Number(destino.monto)),
          ventaId: servicioId,
          createdBy: creadoPor,
          now,
          codigo,
          concepto: `Pago servicio ${codigo}`
        },
        contexto
      );
    }
  } else if (v.cliente_id) {
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

  for (const destino of destinosPrepago.length > 0
    ? destinosPrepago
    : v.cliente_id
      ? [{ cliente_id: v.cliente_id }]
      : []) {
    if (prepagoMonto > 0 && (await saldoPrepagoAgotado(destino.cliente_id, contexto))) {
      await cerrarCuentasPrepagoSaldadas(destino.cliente_id, contexto);
    }
  }
  const condiciones = calcularCondicionesServicio(v, habitacion);
  const { esLibreIngreso, requiereProducto, comisionTotal } = condiciones;
  const estado = calcularEstadoServicio(v, esLibreIngreso);

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
      estado,
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
  validarAnfitrionasConfirmadas(v.usuarios, hostessIds);

  await pausarConflictosServicio(hostessIds, servicioId, contexto);

  const { comisiones, detalleComisionRows, detalleServicioRows } = prepararDetallesServicio(
    hostessIds,
    servicioId,
    now,
    v.es_temporal,
    condiciones,
    generateUUID
  );

  if (detalleComisionRows.length > 0) {
    await registrarComisionesServicio(comisiones, detalleComisionRows, contexto);
  }
  if (detalleServicioRows.length > 0) {
    await insertarDetallesServicio(detalleServicioRows, contexto);
    if (estado !== 1) await ocuparAnfitrionasServicio(hostessIds, contexto);
  }

  await insertarClientesServicio(servicioId, obtenerClientesServicio(v), contexto);

  if (cajaId) {
    await registrarMovimientoCobro(
      cajaId,
      calcularMovimientoCajaServicio(v, pagosMixtos, prepagoMonto, comisionTotal),
      contexto
    );
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
  const previo = await leerImportesServicio(id, contexto);
  if (!previo) throw new NotFoundError('Servicio', id);
  const importes = ['precio_habitacion', 'precio_servicio', 'iva', 'sub_total', 'total'] as const;
  if (
    importes.some(key => body[key] !== undefined && Number(body[key]) !== Number(previo[key] ?? 0))
  ) {
    throw new BusinessError(
      'El servicio ya está cobrado. Para cambiar su importe utiliza la anulación y registra el servicio correcto.',
      'SERVICIO_COBRO_INMUTABLE'
    );
  }
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
