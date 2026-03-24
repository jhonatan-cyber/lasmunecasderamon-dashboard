import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { getNowInBusinessTimezone } from '@/lib/timezoneService';
import { sendNotificationToAll } from '@/lib/sseService';

/**
 * GET /api/timers/active
 */
let lastCleanupTime = 0;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  // Disable cache for real-time data
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const source = req.query.source || 'N/A';

  try {
    const nowStr = getNowInBusinessTimezone();
    const nowObj = new Date();
    const nowTs = Date.now();

    if (nowTs - lastCleanupTime > 10000) {
      lastCleanupTime = nowTs;
      runAutoCleanup(nowStr).catch(err => console.error('[timers/active] cleanup error:', err));
    }
    const [activeServices, activeVentas, activeCuentas] = await Promise.all([
      query(
        `SELECT 
            s.id_servicio as id, 
            s.codigo,
            s.id_servicio as servicioId,
            h.nombre as roomName, 
            s.tiempo as duration, 
            s.fecha_crea as startTime, 
            s.estado, 
            s.paused_at as pausedAt, 
            s.habitacion_id as roomId, 
            'servicio' as tipoTransaccion,
            COALESCE(GROUP_CONCAT(DISTINCT 
                CASE 
                    WHEN u.nick IS NOT NULL AND u.nick != '' THEN u.nick
                    ELSE CONCAT(u.nombre, ' ', u.apellido)
                END 
                SEPARATOR ', '
            ), 'Sin asignar') as anfitrionas,
            GROUP_CONCAT(DISTINCT ds.usuario_id SEPARATOR ',') as anfitrionas_ids,
            GROUP_CONCAT(DISTINCT u.foto SEPARATOR ',') as anfitrionas_fotos,
            COALESCE(CONCAT(c.nombre, ' ', c.apellido), 'Sin cliente') as clienteNombre,
            s.cliente_id,
            s.precio_servicio,
            s.precio_habitacion,
            s.iva,
            s.total,
            s.metodo_pago,
            s.fecha_crea as created_at,
            creator.nick as waiter_name,
            creator.foto as waiter_foto,
            CONCAT(solicitante.nombre, ' ', solicitante.apellido) as solicitante_name,
            solicitante.foto as solicitante_foto,
            COUNT(DISTINCT ds.usuario_id) as total_usuarios,
            AVG(ds.comision) as comision_individual
         FROM servicios s 
         LEFT JOIN habitaciones h ON s.habitacion_id = h.id_habitacion
         LEFT JOIN detalle_servicios ds ON ds.servicio_id = s.id_servicio
         LEFT JOIN usuarios u ON u.id_usuario = ds.usuario_id
         LEFT JOIN clientes c ON c.id_cliente = s.cliente_id
         LEFT JOIN usuarios creator ON creator.id_usuario = s.created_by
         LEFT JOIN solicitudes_servicios ss ON s.codigo = ss.codigo
         LEFT JOIN usuarios solicitante ON solicitante.id_usuario = ss.solicitado_por
         WHERE s.estado IN (2, 3) AND s.tiempo > 0 AND (s.estado = 3 OR TIMESTAMPDIFF(SECOND, s.fecha_crea, ?) < (s.tiempo * 60))
         GROUP BY s.id_servicio`, [nowStr]
      ),
      query(
        `SELECT 
            v.id_venta as id, 
            v.codigo,
            v.id_venta as servicioId,
            h.nombre as roomName, 
            v.tiempo as duration, 
            v.fecha_crea as startTime, 
            v.estado, 
            v.paused_at as pausedAt, 
            v.habitacion_id as roomId, 
            'venta' as tipoTransaccion,
            COALESCE(GROUP_CONCAT(DISTINCT 
                CASE 
                    WHEN u.nick IS NOT NULL AND u.nick != '' THEN u.nick
                    ELSE CONCAT(u.nombre, ' ', u.apellido)
                END 
                SEPARATOR ', '
            ), 'Sin asignar') as anfitrionas,
            GROUP_CONCAT(DISTINCT vu.usuario_id SEPARATOR ',') as anfitrionas_ids,
            GROUP_CONCAT(DISTINCT u.foto SEPARATOR ',') as anfitrionas_fotos,
            COALESCE(CONCAT(c.nombre, ' ', c.apellido), 'Sin cliente') as clienteNombre,
            v.cliente_id,
            v.total,
            v.metodo_pago,
            v.fecha_crea as created_at,
            creator.nick as waiter_name,
            creator.foto as waiter_foto,
            COUNT(DISTINCT vu.usuario_id) as total_usuarios,
            v.total_comision / NULLIF(COUNT(DISTINCT vu.usuario_id), 0) as comision_individual
         FROM ventas v 
         LEFT JOIN habitaciones h ON v.habitacion_id = h.id_habitacion
         LEFT JOIN ventas_usuarios vu ON vu.venta_id = v.id_venta
         LEFT JOIN usuarios u ON u.id_usuario = vu.usuario_id
         LEFT JOIN clientes c ON c.id_cliente = v.cliente_id
         LEFT JOIN usuarios creator ON creator.id_usuario = v.created_by
         WHERE v.estado IN (2, 3) AND v.tiempo > 0 AND (v.estado = 3 OR TIMESTAMPDIFF(SECOND, v.fecha_crea, ?) < (v.tiempo * 60))
         GROUP BY v.id_venta`, [nowStr]
      ),
      query(
        `SELECT 
            c.id_cuenta as id, 
            h.nombre as roomName, 
            c.tiempo as duration, 
            c.fecha_crea as startTime, 
            c.estado, 
            NULL as pausedAt, 
            c.habitacion_id as roomId, 
            'cuenta' as tipoTransaccion
         FROM cuentas c 
         JOIN habitaciones h ON c.habitacion_id = h.id_habitacion
         WHERE c.estado = 1 AND c.tiempo > 0 AND TIMESTAMPDIFF(SECOND, c.fecha_crea, ?) < (c.tiempo * 60)`, [nowStr]
      )
    ]);

    const formatItem = (item: any) => {
      const startTime = item.startTime ? new Date(item.startTime) : nowObj;
      const isPaused = item.estado === 3;
      const duration = Number(item.duration || 0);
      const durationSecs = duration * 60;
      
      const stTime = !isNaN(startTime.getTime()) ? startTime.getTime() : nowObj.getTime();
      const elapsedSecs = Math.floor((nowObj.getTime() - stTime) / 1000);

      const remainingTime = isPaused ? durationSecs : Math.max(0, durationSecs - elapsedSecs);

      return {
        ...item,
        servicioId: item.id ? String(item.id) : '0',
        duration: duration,
        isActive: item.estado === 2 || item.estado === 3 || item.estado === 4,
        isPaused: isPaused,
        remainingTime: isNaN(remainingTime) ? 0 : remainingTime
      };
    };

    const allTimers = [
      ...(activeServices as any[]).map(formatItem),
      ...(activeVentas as any[]).map(formatItem),
      ...(activeCuentas as any[]).map(formatItem)
    ];

    return res.status(200).json({
      success: true,
      data: allTimers,
      serverTime: nowObj.toISOString()
    });
  } catch (error) {
    console.error('[API /timers/active] Error:', error);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
}

async function runAutoCleanup(nowStr: string) {
  let anythingChanged = false;

  const expiredVentas = (await query(
    `SELECT id_venta, habitacion_id FROM ventas WHERE habitacion_id IS NOT NULL AND tiempo > 0 AND estado = 2 AND paused_at IS NULL AND TIMESTAMPDIFF(SECOND, fecha_crea, ?) >= (tiempo * 60)`, [nowStr]
  )) as any[];

  if (expiredVentas.length > 0) {
    anythingChanged = true;
    for (const v of expiredVentas) {
      await query('UPDATE ventas SET estado = 1, fecha_mod = ? WHERE id_venta = ?', [nowStr, v.id_venta]);
      await handleRoomResume(v.habitacion_id, nowStr);
    }
  }

  const expiredServicios = (await query(
    `SELECT id_servicio, habitacion_id FROM servicios WHERE habitacion_id IS NOT NULL AND tiempo > 0 AND estado = 2 AND paused_at IS NULL AND TIMESTAMPDIFF(SECOND, fecha_crea, ?) >= (tiempo * 60)`, [nowStr]
  )) as any[];

  if (expiredServicios.length > 0) {
    anythingChanged = true;
    for (const s of expiredServicios) {
      await query('UPDATE servicios SET estado = 1 WHERE id_servicio = ?', [s.id_servicio]);
      // Liberar anfitrionas del servicio finalizado
      await query(
        `UPDATE usuarios u 
         INNER JOIN detalle_servicios ds ON u.id_usuario = ds.usuario_id 
         SET u.estado_servicio = 0 
         WHERE ds.servicio_id = ?`,
        [s.id_servicio]
      );
      await handleRoomResume(s.habitacion_id, nowStr);
    }
  }

  const expiredCuentas = (await query(
    `SELECT id_cuenta, habitacion_id FROM cuentas WHERE habitacion_id IS NOT NULL AND tiempo > 0 AND estado = 1 AND TIMESTAMPDIFF(SECOND, fecha_crea, ?) >= (tiempo * 60)`, [nowStr]
  )) as any[];

  if (expiredCuentas.length > 0) {
    anythingChanged = true;
    for (const c of expiredCuentas) {
      // No cambiamos el estado de la cuenta (sigue en 1 para cobro manual), 
      // pero liberamos la habitación.
      await handleRoomResume(c.habitacion_id, nowStr);
    }
  }

  if (anythingChanged) {
    console.log(`[CLEANUP] Cambios detectados. Enviando notificación global timers_updated`);
    sendNotificationToAll('timers_updated', { timestamp: nowStr });
  }
}

async function handleRoomResume(habitacionId: string, nowStr: string) {
  const [vP] = (await query('SELECT id_venta, paused_at FROM ventas WHERE habitacion_id = ? AND estado = 3 ORDER BY paused_at DESC LIMIT 1', [habitacionId])) as any[];
  const [sP] = (await query('SELECT id_servicio, paused_at FROM servicios WHERE habitacion_id = ? AND estado = 3 ORDER BY paused_at DESC LIMIT 1', [habitacionId])) as any[];

  if (vP || sP) {
    const resumeV = vP && (!sP || new Date(vP.paused_at) >= new Date(sP.paused_at));
    if (resumeV) {
      await query('UPDATE ventas SET estado = 2, fecha_crea = DATE_ADD(fecha_crea, INTERVAL TIMESTAMPDIFF(SECOND, paused_at, ?) SECOND), paused_at = NULL WHERE id_venta = ?', [nowStr, vP.id_venta]);
    } else {
      await query('UPDATE servicios SET estado = 2, fecha_crea = DATE_ADD(fecha_crea, INTERVAL TIMESTAMPDIFF(SECOND, paused_at, ?) SECOND), paused_at = NULL WHERE id_servicio = ?', [nowStr, sP.id_servicio]);
    }
  } else {
    await query('UPDATE habitaciones SET estado = 1 WHERE id_habitacion = ?', [habitacionId]);
  }
}
