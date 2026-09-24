import { query } from '@/lib/database/db';
import { getNowInBusinessTimezone, parseBusinessDate } from '@/lib/business/timezoneService';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { CuentaRepository } from './CuentaRepository';

export class TimerRepository {
  static async getActive() {
    const now = new Date();

    const [activeServices, activeVentas, activeCuentas] = await Promise.all([
      query(
        `
        SELECT s.id_servicio as id, s.codigo, s.id_servicio AS "servicioId", h.nombre AS "roomName",
               s.tiempo as duration, s.fecha_crea AS "startTime", s.estado, s.paused_at AS "pausedAt",
               s.habitacion_id AS "roomId", 'servicio' AS "tipoTransaccion",
               s.es_temporal, s.servicio_original_id,
               h.comision_anfitriona as habitacion_comision,
               s.precio_servicio, s.precio_habitacion, s.iva, s.cliente_id,
               COALESCE(STRING_AGG(DISTINCT CASE WHEN u.nick IS NOT NULL AND u.nick != '' THEN u.nick ELSE (CAST(u.nombre AS text) || CAST(' ' AS text) || CAST(u.apellido AS text)) END, ', '), 'Sin asignar') as anfitrionas,
               STRING_AGG(DISTINCT ds.usuario_id, ',') as anfitrionas_ids,
               COALESCE((CAST(c.nombre AS text) || CAST(' ' AS text) || CAST(c.apellido AS text)), 'Sin cliente registrado') AS "clienteNombre",
               s.total, s.metodo_pago, creator.nick as waiter_name, creator.foto as waiter_foto
        FROM servicios s
        LEFT JOIN habitaciones h ON s.habitacion_id = h.id_habitacion
        LEFT JOIN detalle_servicios ds ON ds.servicio_id = s.id_servicio
        LEFT JOIN usuarios u ON u.id_usuario = ds.usuario_id
        LEFT JOIN clientes c ON c.id_cliente = s.cliente_id
        LEFT JOIN usuarios creator ON creator.id_usuario = s.created_by
        WHERE s.tiempo > 0
          AND s.estado IN (1, 2, 3)
          AND (s.estado = 3 OR TRUNC(EXTRACT(EPOCH FROM (CAST(? AS timestamp) - CAST(s.fecha_crea AS timestamp))) / 1) < (s.tiempo * 60))
        GROUP BY s.id_servicio, h.id_habitacion, c.id_cliente, creator.id_usuario
      `,
        [getNowInBusinessTimezone()]
      ),
      query(
        `
        SELECT v.id_venta as id, v.codigo, v.id_venta AS "servicioId", h.nombre AS "roomName",
               v.tiempo as duration, v.fecha_crea AS "startTime", v.estado, v.paused_at AS "pausedAt",
               v.habitacion_id AS "roomId", 'venta' AS "tipoTransaccion",
               COALESCE(STRING_AGG(DISTINCT CASE WHEN u.nick IS NOT NULL AND u.nick != '' THEN u.nick ELSE (CAST(u.nombre AS text) || CAST(' ' AS text) || CAST(u.apellido AS text)) END, ', '), 'Sin asignar') as anfitrionas,
               STRING_AGG(DISTINCT vu.usuario_id, ',') as anfitrionas_ids,
               COALESCE((CAST(c.nombre AS text) || CAST(' ' AS text) || CAST(c.apellido AS text)), 'Sin cliente registrado') AS "clienteNombre",
               v.total, v.metodo_pago, creator.nick as waiter_name
        FROM ventas v
        LEFT JOIN habitaciones h ON v.habitacion_id = h.id_habitacion
        LEFT JOIN ventas_usuarios vu ON vu.venta_id = v.id_venta
        LEFT JOIN usuarios u ON u.id_usuario = vu.usuario_id
        LEFT JOIN clientes c ON c.id_cliente = v.cliente_id
        LEFT JOIN usuarios creator ON creator.id_usuario = v.created_by
        WHERE v.tiempo > 0
          AND v.estado IN (1, 2, 3)
          AND (v.estado = 3 OR TRUNC(EXTRACT(EPOCH FROM (CAST(? AS timestamp) - CAST(v.fecha_crea AS timestamp))) / 1) < (v.tiempo * 60))
        GROUP BY v.id_venta, h.id_habitacion, c.id_cliente, creator.id_usuario
      `,
        [getNowInBusinessTimezone()]
      ),
      query(
        `
        SELECT c.id_cuenta as id, c.codigo, c.id_cuenta AS "servicioId", COALESCE(h.nombre, 'Sin habitacion') AS "roomName",
               COALESCE(c.tiempo_actual, c.tiempo) as duration, COALESCE(c.tiempo_inicio_actual, c.fecha_crea) AS "startTime", c.estado, NULL AS "pausedAt",
               c.habitacion_id AS "roomId", 'cuenta' AS "tipoTransaccion",
               COALESCE((CAST(cl.nombre AS text) || CAST(' ' AS text) || CAST(cl.apellido AS text)), 'Sin cliente registrado') AS "clienteNombre",
               c.total, creator.nick as waiter_name
        FROM cuentas c
        LEFT JOIN habitaciones h ON c.habitacion_id = h.id_habitacion
        LEFT JOIN clientes cl ON cl.id_cliente = c.cliente_id
        LEFT JOIN usuarios creator ON creator.id_usuario = c.created_by
        WHERE c.estado = 1
          AND COALESCE(c.tiempo_actual, c.tiempo) > 0
          AND TRUNC(EXTRACT(EPOCH FROM (CAST(? AS timestamp) - CAST(COALESCE(c.tiempo_inicio_actual, c.fecha_crea) AS timestamp))) / 1) < (COALESCE(c.tiempo_actual, c.tiempo) * 60)
      `,
        [getNowInBusinessTimezone()]
      )
    ]);

    const formatItem = (item: any) => {
      const startTime = parseBusinessDate(item.startTime);
      const isPaused = item.estado === 3;
      const pausedAt = item.pausedAt ? parseBusinessDate(item.pausedAt) : null;
      const duration = Number(item.duration || 0);
      const elapsedReference = isPaused && pausedAt ? pausedAt : now;
      const elapsedSecs = Math.max(
        0,
        Math.floor((elapsedReference.getTime() - startTime.getTime()) / 1000)
      );
      const remainingTime = Math.max(0, duration * 60 - elapsedSecs);

      return {
        ...item,
        servicioId: String(item.servicioId ?? item.id),
        duration,
        isActive: item.estado === 1 ? remainingTime > 0 : [2, 3, 4].includes(item.estado),
        isPaused,
        remainingTime,
        isTemporary: Number(item.es_temporal || 0) === 1,
        servicioOriginalId: item.servicio_original_id ? String(item.servicio_original_id) : null
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
    const roomsToResume = new Set<string>();

    const expiredV = await query<any[]>(
      'SELECT id_venta, habitacion_id FROM ventas WHERE habitacion_id IS NOT NULL AND tiempo > 0 AND estado = 2 AND paused_at IS NULL AND TRUNC(EXTRACT(EPOCH FROM (CAST(? AS timestamp) - CAST(fecha_crea AS timestamp))) / 1) >= (tiempo * 60)',
      [nowStr]
    );
    if (expiredV.length > 0) {
      const ids = expiredV.map(v => v.id_venta);
      const placeholders = ids.map(() => '?').join(',');
      await query(
        `UPDATE ventas SET estado = 1, fecha_mod = ? WHERE id_venta IN (${placeholders})`,
        [nowStr, ...ids]
      );
      for (const v of expiredV) {
        if (v.habitacion_id) roomsToResume.add(v.habitacion_id);
      }
      changed = true;
    }

    const expiredS = await query<any[]>(
      'SELECT id_servicio, habitacion_id FROM servicios WHERE habitacion_id IS NOT NULL AND tiempo > 0 AND estado = 2 AND paused_at IS NULL AND TRUNC(EXTRACT(EPOCH FROM (CAST(? AS timestamp) - CAST(fecha_crea AS timestamp))) / 1) >= (tiempo * 60)',
      [nowStr]
    );
    if (expiredS.length > 0) {
      const ids = expiredS.map(s => s.id_servicio);
      const placeholders = ids.map(() => '?').join(',');
      await query(`UPDATE servicios SET estado = 1 WHERE id_servicio IN (${placeholders})`, ids);
      await query(
        `UPDATE usuarios u SET estado_servicio = 0 FROM detalle_servicios ds WHERE u.id_usuario = ds.usuario_id AND ds.servicio_id IN (${placeholders})`,
        ids
      );
      for (const s of expiredS) {
        if (s.habitacion_id) roomsToResume.add(s.habitacion_id);
      }
      changed = true;
    }

    const expiredC = await query<any[]>(
      'SELECT id_cuenta, habitacion_id FROM cuentas WHERE habitacion_id IS NOT NULL AND COALESCE(tiempo_actual, tiempo) > 0 AND estado = 1 AND TRUNC(EXTRACT(EPOCH FROM (CAST(? AS timestamp) - CAST(COALESCE(tiempo_inicio_actual, fecha_crea) AS timestamp))) / 1) >= (COALESCE(tiempo_actual, tiempo) * 60)',
      [nowStr]
    );
    for (const c of expiredC) {
      await CuentaRepository.finalizeRoomSession(c.id_cuenta, nowStr);
      if (c.habitacion_id) roomsToResume.add(c.habitacion_id);
      sendNotificationToAll('timer_stopped', {
        servicioId: c.id_cuenta,
        status: 1,
        tipoTransaccion: 'cuenta'
      });
      changed = true;
    }

    // Una pasada de resume por habitación distinta (no por fila expirada).
    for (const habitacionId of roomsToResume) {
      await this.handleRoomResume(habitacionId, nowStr);
    }

    if (changed) sendNotificationToAll('timers_updated', { timestamp: nowStr });
  }

  private static async handleRoomResume(habitacionId: string, nowStr: string) {
    const [vP] = await query<any[]>(
      'SELECT id_venta, paused_at FROM ventas WHERE habitacion_id = ? AND estado = 3 ORDER BY paused_at DESC LIMIT 1',
      [habitacionId]
    );
    const [sP] = await query<any[]>(
      'SELECT id_servicio, paused_at FROM servicios WHERE habitacion_id = ? AND estado = 3 ORDER BY paused_at DESC LIMIT 1',
      [habitacionId]
    );

    if (vP || sP) {
      const vPDate = vP ? parseBusinessDate(vP.paused_at) : null;
      const sPDate = sP ? parseBusinessDate(sP.paused_at) : null;
      const resumeV = vP && (!sP || (vPDate?.getTime() || 0) >= (sPDate?.getTime() || 0));
      if (resumeV)
        await query(
          'UPDATE ventas SET estado = 2, fecha_crea = (CAST(fecha_crea AS timestamp) + make_interval(secs => CAST(TRUNC(EXTRACT(EPOCH FROM (CAST(? AS timestamp) - CAST(paused_at AS timestamp))) / 1) AS double precision))), paused_at = NULL WHERE id_venta = ?',
          [nowStr, vP.id_venta]
        );
      else
        await query(
          'UPDATE servicios SET estado = 2, fecha_crea = (CAST(fecha_crea AS timestamp) + make_interval(secs => CAST(TRUNC(EXTRACT(EPOCH FROM (CAST(? AS timestamp) - CAST(paused_at AS timestamp))) / 1) AS double precision))), paused_at = NULL WHERE id_servicio = ?',
          [nowStr, sP.id_servicio]
        );
    } else {
      await query('UPDATE habitaciones SET estado = 1 WHERE id_habitacion = ?', [habitacionId]);
    }
  }
}
