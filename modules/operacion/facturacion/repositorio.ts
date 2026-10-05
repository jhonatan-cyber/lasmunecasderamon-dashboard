import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import { resolverTransaccion } from '@/lib/transaccion/infraestructura';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { RoomManager } from '@/lib/services/RoomManager';
export async function ocuparHabitacionVenta(id: string, contexto: ContextoOperacion) {
  await resolverTransaccion(contexto)(
    'UPDATE habitaciones SET estado = 2 WHERE id_habitacion = ?',
    [id]
  );
}
export async function cerrarPedidoFacturado(id: string, contexto: ContextoOperacion) {
  await resolverTransaccion(contexto)('UPDATE pedidos SET estado = 0 WHERE id_pedido = ?', [id]);
}
// Transición de ventas temporizadas; el cobro de cuenta no entra en esta rama.
export function pausarConflictosVenta(ids: string[], ventaId: string, contexto: ContextoOperacion) {
  return RoomManager.pauseConflictingServices(
    resolverTransaccion(contexto),
    ids,
    undefined,
    ventaId
  );
}

export function pausarConflictosServicio(
  ids: string[],
  servicioId: string,
  contexto: ContextoOperacion
) {
  return RoomManager.pauseConflictingServices(resolverTransaccion(contexto), ids, servicioId);
}

/**
 * Libera la habitación al anular una venta. Mismo SQL que ejecutaba
 * `RoomManager.resumeRoomLogic` desde `SaleQueries.updateStatus`: si hay una
 * venta o servicio pausado más reciente se reanuda, si no la habitación vuelve
 * a libre. Vive en Operación porque `habitaciones`, `ventas` en pausa y
 * `servicios` en pausa son de este dominio.
 */
export async function liberarHabitacionPorAnulacion(
  habitacionId: string,
  contexto: ContextoOperacion,
  excluirVentaId?: string,
  excluirServicioId?: string
): Promise<void> {
  if (!habitacionId) return;
  const trx = resolverTransaccion(contexto);
  const vP = await trx<{ id_venta: string; paused_at: unknown }[]>(
    `SELECT id_venta, paused_at FROM ventas WHERE habitacion_id = ? AND estado = 3
     ${excluirVentaId ? 'AND id_venta != ?' : ''} ORDER BY paused_at DESC LIMIT 1`,
    excluirVentaId ? [habitacionId, excluirVentaId] : [habitacionId]
  );
  const sP = await trx<{ id_servicio: string; paused_at: unknown }[]>(
    `SELECT id_servicio, paused_at FROM servicios WHERE habitacion_id = ? AND estado = 3
     ${excluirServicioId ? 'AND id_servicio != ?' : ''} ORDER BY paused_at DESC LIMIT 1`,
    excluirServicioId ? [habitacionId, excluirServicioId] : [habitacionId]
  );
  const hasVP = vP.length > 0;
  const hasSP = sP.length > 0;
  const nowStr = getNowInBusinessTimezone();
  if (hasVP || hasSP) {
    const resumeVenta =
      hasVP &&
      (!hasSP ||
        new Date(String(vP[0].paused_at).replace(' ', 'T')) >=
          new Date(String(sP[0].paused_at).replace(' ', 'T')));
    if (resumeVenta) {
      await trx(
        `UPDATE ventas
            SET estado = 2,
                fecha_crea = (CAST(fecha_crea AS timestamp) + make_interval(secs => CAST(TRUNC(EXTRACT(EPOCH FROM (CAST(? AS timestamp) - CAST(paused_at AS timestamp))) / 1) AS double precision))),
                paused_at = NULL
          WHERE id_venta = ?`,
        [nowStr, vP[0].id_venta]
      );
    } else if (hasSP) {
      await trx(
        `UPDATE servicios
            SET estado = 2,
                fecha_crea = (CAST(fecha_crea AS timestamp) + make_interval(secs => CAST(TRUNC(EXTRACT(EPOCH FROM (CAST(? AS timestamp) - CAST(paused_at AS timestamp))) / 1) AS double precision))),
                paused_at = NULL
          WHERE id_servicio = ?`,
        [nowStr, sP[0].id_servicio]
      );
    }
  } else {
    await trx('UPDATE habitaciones SET estado = 1 WHERE id_habitacion = ?', [habitacionId]);
  }
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
