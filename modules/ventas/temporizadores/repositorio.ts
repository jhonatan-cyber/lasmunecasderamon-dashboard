import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import { resolverTransaccion } from '@/lib/transaccion/infraestructura';
import { query } from '@/lib/database/db';
export async function finalizarVentasTemporizadas(
  ventaIds: string[],
  contexto: ContextoOperacion,
  fecha: string
) {
  if (!ventaIds.length) return;
  await resolverTransaccion(contexto)(
    `UPDATE ventas SET estado = 1, fecha_mod = ? WHERE id_venta IN (${ventaIds.map(() => '?').join(',')})`,
    [fecha, ...ventaIds]
  );
}

export async function pausarVentasEnConflicto(
  ids: string[],
  contexto: ContextoOperacion,
  fecha: string,
  excluirVentaId?: string
) {
  if (!ids?.length) return 0;
  const trx = resolverTransaccion(contexto);
  const filas = await trx<{ id_venta: string }[]>(
    `
      SELECT DISTINCT v.id_venta
      FROM ventas v
      JOIN ventas_usuarios vu ON v.id_venta = vu.venta_id
      JOIN habitaciones h ON v.habitacion_id = h.id_habitacion
      WHERE v.estado = 2
        AND v.paused_at IS NULL
        ${excluirVentaId ? 'AND v.id_venta != ?' : ''}
        AND vu.usuario_id IN (${ids.map(() => '?').join(',')})
        AND v.tiempo > 0`,
    excluirVentaId ? [excluirVentaId, ...ids] : ids
  );
  if (filas.length) {
    await trx(
      `UPDATE ventas SET estado = 3, paused_at = ? WHERE id_venta IN (${filas.map(() => '?').join(',')})`,
      [fecha, ...filas.map(fila => fila.id_venta)]
    );
  }
  return filas.length;
}

export async function obtenerUltimaVentaPausada(
  habitacionId: string,
  contexto: ContextoOperacion,
  excluirVentaId?: string
) {
  return resolverTransaccion(contexto)<{ id_venta: string; paused_at: unknown }[]>(
    `
    SELECT id_venta, paused_at FROM ventas WHERE habitacion_id = ? AND estado = 3
    ${excluirVentaId ? 'AND id_venta != ?' : ''} ORDER BY paused_at DESC LIMIT 1`,
    excluirVentaId ? [habitacionId, excluirVentaId] : [habitacionId]
  );
}

export async function reanudarVentaPausada(
  ventaId: string,
  contexto: ContextoOperacion,
  fecha: string
) {
  await resolverTransaccion(contexto)(
    `UPDATE ventas
    SET estado = 2,
        fecha_crea = (CAST(fecha_crea AS timestamp) + make_interval(secs => CAST(TRUNC(EXTRACT(EPOCH FROM (CAST(? AS timestamp) - CAST(paused_at AS timestamp))) / 1) AS double precision))),
        paused_at = NULL
    WHERE id_venta = ?`,
    [fecha, ventaId]
  );
}

export function marcarAvisoVenta(
  ventaId: string,
  aviso: '5m' | 'fin',
  contexto?: ContextoOperacion
) {
  const columna = aviso === '5m' ? 'push_notified_5m' : 'push_notified_end';
  const ejecutar = contexto ? resolverTransaccion(contexto) : query;
  return ejecutar(`UPDATE ventas SET ${columna} = 1 WHERE id_venta = ?`, [ventaId]);
}

export async function finalizarVentaTemporizada(
  ventaId: string,
  contexto: ContextoOperacion,
  fecha?: string
) {
  await resolverTransaccion(contexto)(
    fecha
      ? 'UPDATE ventas SET estado = 1, fecha_mod = ? WHERE id_venta = ?'
      : 'UPDATE ventas SET estado = 1 WHERE id_venta = ?',
    fecha ? [fecha, ventaId] : [ventaId]
  );
}
