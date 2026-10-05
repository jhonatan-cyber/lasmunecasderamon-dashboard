/**
 * Anulación y estados de servicios — casos de uso del módulo Operación.
 *
 * La anulación coordina a los propietarios en una sola unidad con
 * `ContextoOperacion`: Operación marca el estado, Clientes restituye el
 * prepago, Caja revierte el movimiento, Personal da de baja las comisiones,
 * Identidad actualiza la disponibilidad y la habitación se libera. O confirma
 * todo o no confirma nada (§6). Mismo SQL y mismo orden que `ServiceQueries`.
 *
 * Los avisos (auditoría) se aplazan hasta después del commit.
 */
import { enUnaUnidad, type ContextoOperacion } from '@/lib/transaccion/contrato';
import { ejecutarEfectosConfirmados } from '@/lib/transaccion/efectos';
import { addServicioLog } from '@/lib/utils/logUtils';
import { NotFoundError } from '@/lib/errors/errors';
import { parseMixedPayments } from '@/lib/repositories/service/serviceMappers';
import {
  leerServicioParaAnular,
  leerEstadoServicio,
  marcarEstadoServicio,
  marcarPausaServicio,
  reanudarServicio,
  leerAnfitrionasServicio,
  crearSolicitudAnulacionServicio,
  actualizarEstadoSolicitudServicio,
  leerServicioDeSolicitud
} from './repositorio';
import { registrarMovimientoCobro } from '@/modules/caja';
import { leerPrepagoConsumidoPorVenta, restituirPrepagoPorAnulacion } from '@/modules/clientes';
import {
  revertirComisionesServicioPorAnulacion,
  leerComisionTotalServicioPorAnulacion
} from '@/modules/personal';
import { actualizarDisponibilidad } from '@/modules/identidad';
import { liberarHabitacionPorAnulacion } from '../facturacion/repositorio';

type Tarea = () => void | Promise<void>;

/**
 * Anulación total de un servicio. Mismo orden que
 * `approveAnulacionServicio`: estado, prepago, caja, comisiones, habitación
 * y disponibilidad.
 */
export async function anularServicioEnUnidad(
  servicioId: string,
  approvedBy: string,
  contexto: ContextoOperacion,
  aplazar: (tarea: Tarea) => void
): Promise<void> {
  const servicio = await leerServicioParaAnular(servicioId, contexto);
  if (!servicio) throw new NotFoundError('Servicio', servicioId);
  const habitacionId = servicio.habitacion_id;
  const clienteId = servicio.cliente_id;
  const cajaId = servicio.caja_id;
  const metodoPago = String(servicio.metodo_pago || '');
  const total = Number(servicio.total || 0);
  const iva = Number(servicio.iva || 0);
  const pagosMixtos = parseMixedPayments(servicio.pagos_mixtos);

  const prepagoMonto =
    clienteId != null ? await leerPrepagoConsumidoPorVenta(clienteId, servicioId, contexto) : 0;
  const totalComision = await leerComisionTotalServicioPorAnulacion(servicioId, contexto);

  let efectivo = 0;
  let tarjeta = 0;
  let transferencia = 0;
  if (metodoPago === 'mixto') {
    for (const pago of pagosMixtos) {
      if (pago.metodo === 'efectivo') efectivo += pago.monto;
      if (pago.metodo === 'tarjeta') tarjeta += pago.monto;
      if (pago.metodo === 'transferencia') transferencia += pago.monto;
    }
  } else {
    const montoMetodoPrincipal = Math.max(0, total - prepagoMonto);
    if (metodoPago === 'efectivo') efectivo = montoMetodoPrincipal;
    if (metodoPago === 'tarjeta') tarjeta = montoMetodoPrincipal;
    if (metodoPago === 'transferencia') transferencia = montoMetodoPrincipal;
  }

  await marcarEstadoServicio(servicioId, 0, contexto);

  if (clienteId && prepagoMonto > 0) {
    await restituirPrepagoPorAnulacion(
      {
        clienteId,
        ventaId: servicioId,
        monto: prepagoMonto,
        usuarioId: approvedBy || null,
        concepto: `Anulacion servicio ${servicioId}`
      },
      contexto
    );
  }

  if (cajaId) {
    await registrarMovimientoCobro(
      cajaId,
      {
        servicio: -(total - iva),
        efectivo: -efectivo,
        tarjeta: -tarjeta,
        transferencia: -transferencia,
        prepago: -prepagoMonto,
        iva: -iva,
        comision: -totalComision,
        devolucion: total
      },
      contexto
    );
  }

  await revertirComisionesServicioPorAnulacion(servicioId, contexto);

  if (habitacionId)
    await liberarHabitacionPorAnulacion(habitacionId, contexto, undefined, servicioId);
  const anfitrionas = await leerAnfitrionasServicio(servicioId, contexto);
  await actualizarDisponibilidad(anfitrionas, contexto, servicioId);

  aplazar(async () => {
    await addServicioLog(servicioId, 'ANULADO', 'Servicio anulado.', approvedBy);
  });
}

export async function aprobarAnulacionServicio(
  servicioId: string,
  approvedBy: string
): Promise<void> {
  const tareas: Tarea[] = [];
  const aplazar = (tarea: Tarea) => tareas.push(tarea);
  await enUnaUnidad(unidad =>
    unidad.ejecutar(contexto => anularServicioEnUnidad(servicioId, approvedBy, contexto, aplazar))
  );
  await ejecutarEfectosConfirmados(tareas);
}

export async function actualizarEstadoServicio(
  id: string,
  estado: number,
  userId?: string
): Promise<void> {
  const tareas: Tarea[] = [];
  const aplazar = (tarea: Tarea) => tareas.push(tarea);
  await enUnaUnidad(unidad =>
    unidad.ejecutar(async contexto => {
      const previo = await leerEstadoServicio(id, contexto);
      if (!previo) throw new NotFoundError('Servicio', id);
      const estadoAnterior = previo.estado;
      const habitacionId = previo.habitacion_id;

      await marcarEstadoServicio(id, estado, contexto);

      if (estado === 1 || estado === 0) {
        const wasActive = estadoAnterior === 2 || estadoAnterior === 3;
        if (habitacionId && wasActive) {
          await liberarHabitacionPorAnulacion(habitacionId, contexto, undefined, id);
        }
        const anfitrionas = await leerAnfitrionasServicio(id, contexto);
        await actualizarDisponibilidad(anfitrionas, contexto, id);
      }

      if (estado === 1 && estadoAnterior !== 1) {
        aplazar(async () => {
          await addServicioLog(id, 'FINALIZADO', 'Servicio finalizado manualmente.', userId);
        });
      } else if (estado === 0 && estadoAnterior !== 0) {
        aplazar(async () => {
          await addServicioLog(id, 'ANULADO', 'Servicio anulado.', userId);
        });
      } else if (estado === 3 && estadoAnterior !== 3) {
        await marcarPausaServicio(id, contexto);
        aplazar(async () => {
          await addServicioLog(id, 'PAUSA', 'Servicio pausado manualmente.', userId);
        });
      } else if (estadoAnterior === 3 && estado === 2) {
        if (await reanudarServicio(id, previo.paused_at, contexto)) {
          aplazar(async () => {
            await addServicioLog(id, 'REANUDACION', 'Servicio reanudado manualmente.', userId);
          });
        }
      }
    })
  );
  await ejecutarEfectosConfirmados(tareas);
}

export async function solicitarAnulacionServicio(
  id: string,
  motivo: string,
  solicitadoPor: string
): Promise<string> {
  return await enUnaUnidad(unidad =>
    unidad.ejecutar(contexto =>
      crearSolicitudAnulacionServicio(id, motivo, solicitadoPor, contexto)
    )
  );
}

export async function procesarAnulacionServicio(
  requestId: string,
  approvedBy: string,
  status: string
): Promise<void> {
  const tareas: Tarea[] = [];
  const aplazar = (tarea: Tarea) => tareas.push(tarea);
  await enUnaUnidad(unidad =>
    unidad.ejecutar(async contexto => {
      const nextStatus = await actualizarEstadoSolicitudServicio(requestId, status, contexto);
      const servicioId = await leerServicioDeSolicitud(requestId, contexto);
      if (!servicioId) throw new NotFoundError('Solicitud de anulacion de servicio', requestId);
      if (nextStatus === 'confirmada') {
        await anularServicioEnUnidad(servicioId, approvedBy, contexto, aplazar);
      }
    })
  );
  await ejecutarEfectosConfirmados(tareas);
}
