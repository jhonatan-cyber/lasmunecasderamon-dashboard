import { type TransactionQuery } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';

export class RoomManager {
  static async pauseConflictingServices(
    trx: TransactionQuery,
    hostessIds: string[],
    excludeServiceId?: string,
    excludeVentaId?: string
  ) {
    if (!hostessIds || hostessIds.length === 0) return;

    const placeholders = hostessIds.map(() => '?').join(',');
    const now = getNowInBusinessTimezone();

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

  static async resumeRoomLogic(
    trx: TransactionQuery,
    habitacionId: string,
    excludeServiceId?: string,
    excludeVentaId?: string
  ) {
    if (!habitacionId) return;

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


    if (hasVP || hasSP) {
      const resumeVenta = hasVP && (!hasSP || new Date(vP[0].paused_at.toString().replace(' ', 'T')) >= new Date(sP[0].paused_at.toString().replace(' ', 'T')));

      if (resumeVenta) {
        await trx(`
          UPDATE ventas
          SET estado = 2,
              fecha_crea = (CAST(fecha_crea AS timestamp) + make_interval(secs => CAST(TRUNC(EXTRACT(EPOCH FROM (CAST(? AS timestamp) - CAST(paused_at AS timestamp))) / 1) AS double precision))),
              paused_at = NULL
          WHERE id_venta = ?
        `, [nowStr, vP[0].id_venta]);
      } else if (hasSP) {
        await trx(`
          UPDATE servicios
          SET estado = 2,
              fecha_crea = (CAST(fecha_crea AS timestamp) + make_interval(secs => CAST(TRUNC(EXTRACT(EPOCH FROM (CAST(? AS timestamp) - CAST(paused_at AS timestamp))) / 1) AS double precision))),
              paused_at = NULL
          WHERE id_servicio = ?
        `, [nowStr, sP[0].id_servicio]);
      }
    } else {
      await trx('UPDATE habitaciones SET estado = 1 WHERE id_habitacion = ?', [habitacionId]);
    }
  }
  static async updateHostessServiceStatus(
    trx: TransactionQuery,
    hostessIds: string[],
    excludeServiceId?: string,
    excludeVentaId?: string
  ) {
    if (!hostessIds || hostessIds.length === 0) return;

    for (const hId of hostessIds) {
      const activeServices = await trx<any[]>(`
        SELECT s.id_servicio
        FROM servicios s
        JOIN detalle_servicios ds ON s.id_servicio = ds.servicio_id
        WHERE ds.usuario_id = ? AND s.estado = 2
          ${excludeServiceId ? 'AND s.id_servicio != ?' : ''}
        LIMIT 1
      `, excludeServiceId ? [hId, excludeServiceId] : [hId]);

      const activeVentas = await trx<any[]>(`
        SELECT v.id_venta
        FROM ventas v
        JOIN ventas_usuarios vu ON v.id_venta = vu.venta_id
        WHERE vu.usuario_id = ? AND v.estado = 2 AND v.tiempo > 0
          ${excludeVentaId ? 'AND v.id_venta != ?' : ''}
        LIMIT 1
      `, excludeVentaId ? [hId, excludeVentaId] : [hId]);

      if (activeServices.length === 0 && activeVentas.length === 0) {
        await trx('UPDATE usuarios SET estado_servicio = 0 WHERE id_usuario = ?', [hId]);
      }
    }
  }
}
