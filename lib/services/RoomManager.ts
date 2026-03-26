import { type TransactionQuery } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';

/**
 * Service to manage room states and conflicting services/sales.
 * Centralizes the logic for pausing, resuming, and user status management.
 */
export class RoomManager {
  /**
   * Pauses any active services or sales for the specified hostesses that might conflict.
   * Typically called when a new service/sale in a room starts.
   */
  static async pauseConflictingServices(
    trx: TransactionQuery,
    hostessIds: string[],
    excludeServiceId?: string,
    excludeVentaId?: string
  ) {
    if (!hostessIds || hostessIds.length === 0) return;

    const placeholders = hostessIds.map(() => '?').join(',');
    const now = getNowInBusinessTimezone();

    // 1. Pause conflicting Servicios
    const sSql = `
      SELECT DISTINCT s.id_servicio 
      FROM servicios s 
      JOIN detalle_servicios ds ON s.id_servicio = ds.servicio_id 
      JOIN habitaciones h ON s.habitacion_id = h.id_habitacion 
      WHERE s.estado = 2 
        AND s.paused_at IS NULL 
        ${excludeServiceId ? 'AND s.id_servicio != ?' : ''}
        AND ds.usuario_id IN (${placeholders}) 
        AND (h.precio > 0 OR h.comision_anfitriona > 0 OR h.tiempo > 0)
    `;
    const sParams = excludeServiceId ? [excludeServiceId, ...hostessIds] : [...hostessIds];
    const serviciosToPause = await trx<any[]>(sSql, sParams);

    for (const s of serviciosToPause) {
      await trx('UPDATE servicios SET estado = 3, paused_at = ? WHERE id_servicio = ?', [now, s.id_servicio]);
    }

    // 2. Pause conflicting Ventas (that have room time)
    const vSql = `
      SELECT DISTINCT v.id_venta 
      FROM ventas v 
      JOIN ventas_usuarios vu ON v.id_venta = vu.venta_id 
      JOIN habitaciones h ON v.habitacion_id = h.id_habitacion 
      WHERE v.estado = 2 
        AND v.paused_at IS NULL 
        ${excludeVentaId ? 'AND v.id_venta != ?' : ''}
        AND vu.usuario_id IN (${placeholders}) 
        AND v.tiempo > 0
    `;
    const vParams = excludeVentaId ? [excludeVentaId, ...hostessIds] : [...hostessIds];
    const ventasToPause = await trx<any[]>(vSql, vParams);

    for (const v of ventasToPause) {
      await trx('UPDATE ventas SET estado = 3, paused_at = ? WHERE id_venta = ?', [now, v.id_venta]);
    }

    return { pausedServicios: serviciosToPause.length, pausedVentas: ventasToPause.length };
  }

  /**
   * Resumes the most recently paused service or sale in a room after another one finishes.
   * If no paused ones, releases the room.
   */
  static async resumeRoomLogic(
    trx: TransactionQuery,
    habitacionId: string,
    excludeServiceId?: string,
    excludeVentaId?: string
  ) {
    if (!habitacionId) return;

    // Find most recently paused Venta or Servicio in the same room
    const vP = await trx<any[]>(`
      SELECT id_venta, paused_at 
      FROM ventas 
      WHERE habitacion_id = ? AND estado = 3 
        ${excludeVentaId ? 'AND id_venta != ?' : ''} 
      ORDER BY paused_at DESC LIMIT 1
    `, excludeVentaId ? [habitacionId, excludeVentaId] : [habitacionId]);

    const sP = await trx<any[]>(`
      SELECT id_servicio, paused_at 
      FROM servicios 
      WHERE habitacion_id = ? AND estado = 3 
        ${excludeServiceId ? 'AND id_servicio != ?' : ''} 
      ORDER BY paused_at DESC LIMIT 1
    `, excludeServiceId ? [habitacionId, excludeServiceId] : [habitacionId]);

    const hasVP = vP.length > 0;
    const hasSP = sP.length > 0;

    const nowStr = getNowInBusinessTimezone();
    const nowObj = new Date(nowStr.replace(' ', 'T'));

    if (hasVP || hasSP) {
      // Logic to decide which one to resume (the one that was paused last)
      const resumeVenta = hasVP && (!hasSP || new Date(vP[0].paused_at.toString().replace(' ', 'T')) >= new Date(sP[0].paused_at.toString().replace(' ', 'T')));

      if (resumeVenta) {
        await trx(`
          UPDATE ventas 
          SET estado = 2, 
              fecha_crea = DATE_ADD(fecha_crea, INTERVAL TIMESTAMPDIFF(SECOND, paused_at, ?) SECOND), 
              paused_at = NULL 
          WHERE id_venta = ?
        `, [nowStr, vP[0].id_venta]);
      } else if (hasSP) {
        await trx(`
          UPDATE servicios 
          SET estado = 2, 
              fecha_crea = DATE_ADD(fecha_crea, INTERVAL TIMESTAMPDIFF(SECOND, paused_at, ?) SECOND), 
              paused_at = NULL 
          WHERE id_servicio = ?
        `, [nowStr, sP[0].id_servicio]);
      }
    } else {
      // No one left, free the room
      await trx('UPDATE habitaciones SET estado = 1 WHERE id_habitacion = ?', [habitacionId]);
    }
  }

  /**
   * Updates the service status of hostesses. Sets it to 0 if they don't have any pending room work.
   */
  static async updateHostessServiceStatus(
    trx: TransactionQuery,
    hostessIds: string[],
    excludeServiceId?: string,
    excludeVentaId?: string
  ) {
    if (!hostessIds || hostessIds.length === 0) return;

    for (const hId of hostessIds) {
      // Check for any active or paused service
      const otherS = await trx<any[]>(`
        SELECT COUNT(*) as cnt 
        FROM detalle_servicios ds 
        JOIN servicios s ON ds.servicio_id = s.id_servicio 
        WHERE s.estado IN (2, 3, 4) 
          ${excludeServiceId ? 'AND s.id_servicio != ?' : ''} 
          AND ds.usuario_id = ?
      `, excludeServiceId ? [excludeServiceId, hId] : [hId]);

      // Check for any active or paused room-based sale
      const otherV = await trx<any[]>(`
        SELECT COUNT(*) as cnt 
        FROM ventas_usuarios vu 
        JOIN ventas v ON vu.venta_id = v.id_venta 
        WHERE v.estado IN (2, 3, 4) 
          ${excludeVentaId ? 'AND v.id_venta != ?' : ''} 
          AND vu.usuario_id = ?
      `, excludeVentaId ? [excludeVentaId, hId] : [hId]);

      if ((otherS[0]?.cnt || 0) === 0 && (otherV[0]?.cnt || 0) === 0) {
        await trx('UPDATE usuarios SET estado_servicio = 0 WHERE id_usuario = ?', [hId]);
      } else {
        await trx('UPDATE usuarios SET estado_servicio = 1 WHERE id_usuario = ?', [hId]);
      }
    }
  }
}
