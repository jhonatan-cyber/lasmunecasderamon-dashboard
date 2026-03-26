import { query } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { sendNotificationToAll } from '@/lib/api/sseService';

export class TimerRepository {
  static async getActive() {
    const nowStr = getNowInBusinessTimezone();
    const nowObj = new Date(nowStr.replace(' ', 'T'));

    const [activeServices, activeVentas, activeCuentas] = await Promise.all([
      query(`
        SELECT s.id_servicio as id, s.codigo, s.id_servicio as servicioId, h.nombre as roomName, 
               s.tiempo as duration, s.fecha_crea as startTime, s.estado, s.paused_at as pausedAt, 
               s.habitacion_id as roomId, 'servicio' as tipoTransaccion,
               COALESCE(GROUP_CONCAT(DISTINCT CASE WHEN u.nick IS NOT NULL AND u.nick != '' THEN u.nick ELSE CONCAT(u.nombre, ' ', u.apellido) END SEPARATOR ', '), 'Sin asignar') as anfitrionas,
               GROUP_CONCAT(DISTINCT ds.usuario_id SEPARATOR ',') as anfitrionas_ids,
               COALESCE(CONCAT(c.nombre, ' ', c.apellido), 'Sin cliente') as clienteNombre,
               s.total, s.metodo_pago, creator.nick as waiter_name
        FROM servicios s 
        LEFT JOIN habitaciones h ON s.habitacion_id = h.id_habitacion
        LEFT JOIN detalle_servicios ds ON ds.servicio_id = s.id_servicio
        LEFT JOIN usuarios u ON u.id_usuario = ds.usuario_id
        LEFT JOIN clientes c ON c.id_cliente = s.cliente_id
        LEFT JOIN usuarios creator ON creator.id_usuario = s.created_by
        WHERE s.estado IN (2, 3) AND s.tiempo > 0 AND (s.estado = 3 OR TIMESTAMPDIFF(SECOND, s.fecha_crea, ?) < (s.tiempo * 60))
        GROUP BY s.id_servicio
      `, [nowStr]),
      query(`
        SELECT v.id_venta as id, v.codigo, v.id_venta as servicioId, h.nombre as roomName, 
               v.tiempo as duration, v.fecha_crea as startTime, v.estado, v.paused_at as pausedAt, 
               v.habitacion_id as roomId, 'venta' as tipoTransaccion,
               COALESCE(GROUP_CONCAT(DISTINCT CASE WHEN u.nick IS NOT NULL AND u.nick != '' THEN u.nick ELSE CONCAT(u.nombre, ' ', u.apellido) END SEPARATOR ', '), 'Sin asignar') as anfitrionas,
               GROUP_CONCAT(DISTINCT vu.usuario_id SEPARATOR ',') as anfitrionas_ids,
               COALESCE(CONCAT(c.nombre, ' ', c.apellido), 'Sin cliente') as clienteNombre,
               v.total, v.metodo_pago, creator.nick as waiter_name
        FROM ventas v 
        LEFT JOIN habitaciones h ON v.habitacion_id = h.id_habitacion
        LEFT JOIN ventas_usuarios vu ON vu.venta_id = v.id_venta
        LEFT JOIN usuarios u ON u.id_usuario = vu.usuario_id
        LEFT JOIN clientes c ON c.id_cliente = v.cliente_id
        LEFT JOIN usuarios creator ON creator.id_usuario = v.created_by
        WHERE v.estado IN (2, 3) AND v.tiempo > 0 AND (v.estado = 3 OR TIMESTAMPDIFF(SECOND, v.fecha_crea, ?) < (v.tiempo * 60))
        GROUP BY v.id_venta
      `, [nowStr]),
      query(`
        SELECT c.id_cuenta as id, h.nombre as roomName, c.tiempo as duration, c.fecha_crea as startTime, 
               c.estado, NULL as pausedAt, c.habitacion_id as roomId, 'cuenta' as tipoTransaccion
        FROM cuentas c 
        JOIN habitaciones h ON c.habitacion_id = h.id_habitacion
        WHERE c.estado = 1 AND c.tiempo > 0 AND TIMESTAMPDIFF(SECOND, c.fecha_crea, ?) < (c.tiempo * 60)
      `, [nowStr])
    ]);

    const formatItem = (item: any) => {
      const startTime = item.startTime ? new Date(item.startTime) : nowObj;
      const isPaused = item.estado === 3;
      const duration = Number(item.duration || 0);
      const elapsedSecs = Math.floor((nowObj.getTime() - startTime.getTime()) / 1000);
      const remainingTime = isPaused ? duration * 60 : Math.max(0, duration * 60 - elapsedSecs);

      return {
        ...item,
        servicioId: String(item.id),
        duration,
        isActive: [2, 3, 4].includes(item.estado),
        isPaused,
        remainingTime
      };
    };

    return [
      ...(activeServices as any[]).map(formatItem),
      ...(activeVentas as any[]).map(formatItem),
      ...(activeCuentas as any[]).map(formatItem)
    ];
  }

  static async runAutoCleanup() {
    const nowStr = getNowInBusinessTimezone();
    let changed = false;

    const expiredV = await query<any[]>('SELECT id_venta, habitacion_id FROM ventas WHERE habitacion_id IS NOT NULL AND tiempo > 0 AND estado = 2 AND paused_at IS NULL AND TIMESTAMPDIFF(SECOND, fecha_crea, ?) >= (tiempo * 60)', [nowStr]);
    for (const v of expiredV) {
      await query('UPDATE ventas SET estado = 1, fecha_mod = ? WHERE id_venta = ?', [nowStr, v.id_venta]);
      await this.handleRoomResume(v.habitacion_id, nowStr);
      changed = true;
    }

    const expiredS = await query<any[]>('SELECT id_servicio, habitacion_id FROM servicios WHERE habitacion_id IS NOT NULL AND tiempo > 0 AND estado = 2 AND paused_at IS NULL AND TIMESTAMPDIFF(SECOND, fecha_crea, ?) >= (tiempo * 60)', [nowStr]);
    for (const s of expiredS) {
      await query('UPDATE servicios SET estado = 1 WHERE id_servicio = ?', [s.id_servicio]);
      await query('UPDATE usuarios u INNER JOIN detalle_servicios ds ON u.id_usuario = ds.usuario_id SET u.estado_servicio = 0 WHERE ds.servicio_id = ?', [s.id_servicio]);
      await this.handleRoomResume(s.habitacion_id, nowStr);
      changed = true;
    }

    if (changed) sendNotificationToAll('timers_updated', { timestamp: nowStr });
  }

  private static async handleRoomResume(habitacionId: string, nowStr: string) {
    const [vP] = await query<any[]>('SELECT id_venta, paused_at FROM ventas WHERE habitacion_id = ? AND estado = 3 ORDER BY paused_at DESC LIMIT 1', [habitacionId]);
    const [sP] = await query<any[]>('SELECT id_servicio, paused_at FROM servicios WHERE habitacion_id = ? AND estado = 3 ORDER BY paused_at DESC LIMIT 1', [habitacionId]);

    if (vP || sP) {
      const resumeV = vP && (!sP || new Date(vP.paused_at.toString().replace(' ', 'T')) >= new Date(sP.paused_at.toString().replace(' ', 'T')));
      if (resumeV) await query('UPDATE ventas SET estado = 2, fecha_crea = DATE_ADD(fecha_crea, INTERVAL TIMESTAMPDIFF(SECOND, paused_at, ?) SECOND), paused_at = NULL WHERE id_venta = ?', [nowStr, vP.id_venta]);
      else await query('UPDATE servicios SET estado = 2, fecha_crea = DATE_ADD(fecha_crea, INTERVAL TIMESTAMPDIFF(SECOND, paused_at, ?) SECOND), paused_at = NULL WHERE id_servicio = ?', [nowStr, sP.id_servicio]);
    } else {
      await query('UPDATE habitaciones SET estado = 1 WHERE id_habitacion = ?', [habitacionId]);
    }
  }
}
