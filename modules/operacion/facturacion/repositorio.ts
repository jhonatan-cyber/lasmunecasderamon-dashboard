import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import { resolverTransaccion } from '@/lib/transaccion/infraestructura';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';

export async function ocuparHabitacionVenta(id: string, contexto: ContextoOperacion) {
  await resolverTransaccion(contexto)(
    'UPDATE habitaciones SET estado = 2 WHERE id_habitacion = ?',
    [id]
  );
}
export async function cerrarPedidoFacturado(id: string, contexto: ContextoOperacion) {
  await resolverTransaccion(contexto)('UPDATE pedidos SET estado = 0 WHERE id_pedido = ?', [id]);
}
export async function reabrirPedidoPorAnulacion(
  pedidoId: string,
  contexto: ContextoOperacion
): Promise<void> {
  if (!pedidoId) return;
  await resolverTransaccion(contexto)('UPDATE pedidos SET estado = 1 WHERE id_pedido = ?', [
    pedidoId
  ]);
}

export async function marcarPedidoPorAnulacion(
  pedidoId: string,
  estado: number,
  contexto: ContextoOperacion
): Promise<void> {
  if (!pedidoId) return;
  await resolverTransaccion(contexto)('UPDATE pedidos SET estado = ? WHERE id_pedido = ?', [
    estado,
    pedidoId
  ]);
}

/**
 * Ocupa la habitación cuando corresponde (`updateCuenta` lo hacía al extender
 * tiempo o al cambiar de habitación configurada). La condición se evalúa con
 * la fila ya leída, igual que el `AND (precio > 0 OR tiempo > 0)` heredado.
 */
export async function ocuparHabitacionSiCorresponde(
  habitacionId: string,
  corresponde: boolean,
  contexto: ContextoOperacion
): Promise<void> {
  if (!corresponde) return;
  await resolverTransaccion(contexto)(
    'UPDATE habitaciones SET estado = 2 WHERE id_habitacion = ?',
    [habitacionId]
  );
}

export async function consultarHabitacion(habitacionId: string, contexto: ContextoOperacion) {
  const trx = resolverTransaccion(contexto);
  return await trx<any[]>(
    'SELECT precio, comision_anfitriona FROM habitaciones WHERE id_habitacion = ?',
    [habitacionId]
  );
}

export async function pausarServiciosEnConflicto(
  ids: string[],
  contexto: ContextoOperacion,
  fecha: string,
  excluirServicioId?: string
) {
  if (!ids?.length) return 0;
  const trx = resolverTransaccion(contexto);
  const filas = await trx<{ id_servicio: string }[]>(
    `
    SELECT DISTINCT s.id_servicio FROM servicios s
    JOIN detalle_servicios ds ON s.id_servicio = ds.servicio_id
    JOIN habitaciones h ON s.habitacion_id = h.id_habitacion
    WHERE s.estado = 2 AND s.paused_at IS NULL
      ${excluirServicioId ? 'AND s.id_servicio != ?' : ''}
      AND ds.usuario_id IN (${ids.map(() => '?').join(',')})
      AND (h.precio > 0 OR h.comision_anfitriona > 0 OR h.tiempo > 0)`,
    excluirServicioId ? [excluirServicioId, ...ids] : ids
  );
  if (filas.length)
    await trx(
      `UPDATE servicios SET estado = 3, paused_at = ? WHERE id_servicio IN (${filas.map(() => '?').join(',')})`,
      [fecha, ...filas.map(fila => fila.id_servicio)]
    );
  return filas.length;
}

export function obtenerUltimoServicioPausado(
  habitacionId: string,
  contexto: ContextoOperacion,
  excluirServicioId?: string
) {
  return resolverTransaccion(contexto)<{ id_servicio: string; paused_at: unknown }[]>(
    `SELECT id_servicio, paused_at FROM servicios WHERE habitacion_id = ? AND estado = 3
    ${excluirServicioId ? 'AND id_servicio != ?' : ''} ORDER BY paused_at DESC LIMIT 1`,
    excluirServicioId ? [habitacionId, excluirServicioId] : [habitacionId]
  );
}

export async function reanudarServicioPausado(
  servicioId: string,
  contexto: ContextoOperacion,
  fecha: string
) {
  await resolverTransaccion(contexto)(
    `UPDATE servicios SET estado = 2,
    fecha_crea = (CAST(fecha_crea AS timestamp) + make_interval(secs => CAST(TRUNC(EXTRACT(EPOCH FROM (CAST(? AS timestamp) - CAST(paused_at AS timestamp))) / 1) AS double precision))), paused_at = NULL WHERE id_servicio = ?`,
    [fecha, servicioId]
  );
}

export async function liberarHabitacion(habitacionId: string, contexto: ContextoOperacion) {
  await resolverTransaccion(contexto)(
    'UPDATE habitaciones SET estado = 1 WHERE id_habitacion = ?',
    [habitacionId]
  );
}
