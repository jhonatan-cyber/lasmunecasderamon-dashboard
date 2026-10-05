import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import {
  pausarVentasEnConflicto,
  obtenerUltimaVentaPausada,
  reanudarVentaPausada
} from '@/modules/ventas';
import * as repositorio from './repositorio';

export async function pausarConflictos(
  ids: string[],
  contexto: ContextoOperacion,
  servicioId?: string,
  ventaId?: string
) {
  if (!ids?.length) return;
  const fecha = getNowInBusinessTimezone();
  const pausedServicios = await repositorio.pausarServiciosEnConflicto(
    ids,
    contexto,
    fecha,
    servicioId
  );
  const pausedVentas = await pausarVentasEnConflicto(ids, contexto, fecha, ventaId);
  return { pausedServicios, pausedVentas };
}

export function pausarConflictosVenta(ids: string[], ventaId: string, contexto: ContextoOperacion) {
  return pausarConflictos(ids, contexto, undefined, ventaId);
}

export function pausarConflictosServicio(
  ids: string[],
  servicioId: string,
  contexto: ContextoOperacion
) {
  return pausarConflictos(ids, contexto, servicioId);
}

/** La elección conserva el orden temporal; cada propietario reanuda su entidad. */
export async function liberarHabitacionPorAnulacion(
  habitacionId: string,
  contexto: ContextoOperacion,
  excluirVentaId?: string,
  excluirServicioId?: string
) {
  if (!habitacionId) return;
  const ventas = await obtenerUltimaVentaPausada(habitacionId, contexto, excluirVentaId);
  const servicios = await repositorio.obtenerUltimoServicioPausado(
    habitacionId,
    contexto,
    excluirServicioId
  );
  const fecha = getNowInBusinessTimezone();
  const reanudarVenta =
    ventas.length &&
    (!servicios.length ||
      new Date(String(ventas[0].paused_at).replace(' ', 'T')) >=
        new Date(String(servicios[0].paused_at).replace(' ', 'T')));
  if (reanudarVenta) await reanudarVentaPausada(ventas[0].id_venta, contexto, fecha);
  else if (servicios.length)
    await repositorio.reanudarServicioPausado(servicios[0].id_servicio, contexto, fecha);
  else await repositorio.liberarHabitacion(habitacionId, contexto);
}

export function ocuparHabitacionVenta(
  ...args: Parameters<typeof repositorio.ocuparHabitacionVenta>
) {
  return repositorio.ocuparHabitacionVenta(...args);
}
export function cerrarPedidoFacturado(
  ...args: Parameters<typeof repositorio.cerrarPedidoFacturado>
) {
  return repositorio.cerrarPedidoFacturado(...args);
}
export function ocuparHabitacionSiCorresponde(
  ...args: Parameters<typeof repositorio.ocuparHabitacionSiCorresponde>
) {
  return repositorio.ocuparHabitacionSiCorresponde(...args);
}
export function reabrirPedidoPorAnulacion(
  ...args: Parameters<typeof repositorio.reabrirPedidoPorAnulacion>
) {
  return repositorio.reabrirPedidoPorAnulacion(...args);
}
export function marcarPedidoPorAnulacion(
  ...args: Parameters<typeof repositorio.marcarPedidoPorAnulacion>
) {
  return repositorio.marcarPedidoPorAnulacion(...args);
}
export function consultarHabitacion(...args: Parameters<typeof repositorio.consultarHabitacion>) {
  return repositorio.consultarHabitacion(...args);
}
