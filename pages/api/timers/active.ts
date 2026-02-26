import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { sendNotificationToAll } from '@/pages/api/notifications/sse';

/**
 * GET /api/timers/active
 * Obtiene todos los servicios y ventas activos con habitación y tiempo, con información de temporizadores
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  try {
    // --- AUTO-CLEANUP DE VENTAS EXPIRADAS ---
    // Busca ventas en proceso (estado 2) cuyo temporizador ya terminó
    const expiredVentas = await query(
      `SELECT id_venta, habitacion_id FROM ventas 
       WHERE habitacion_id IS NOT NULL 
         AND tiempo > 0 
         AND estado = 2
         AND paused_at IS NULL
         AND TIMESTAMPDIFF(MINUTE, fecha_crea, NOW()) >= tiempo`,
      []
    ) as any[];

    if (Array.isArray(expiredVentas) && expiredVentas.length > 0) {
      console.log(`[API /timers/active] Auto-limpiando ${expiredVentas.length} ventas expiradas...`);
      for (const venta of expiredVentas) {
        // 1. Liberar habitación
        if (venta.habitacion_id) {
          const roomInfo = (await query('SELECT precio, comision_anfitriona, tiempo FROM habitaciones WHERE id_habitacion = ?', [venta.habitacion_id])) as any[];
          if (roomInfo.length > 0) {
            const room = roomInfo[0];
            const isFreeRoom = !Number(room.precio) && !Number(room.comision_anfitriona) && !Number(room.tiempo);
            if (!isFreeRoom) {
              await query('UPDATE habitaciones SET estado = 1 WHERE id_habitacion = ?', [venta.habitacion_id]);
            }
          }
        }

        // 2. Liberar anfitrionas asociadas
        const anfitrionasLiberadas = await query(
          `SELECT vu.usuario_id, r.nombre as rol 
           FROM ventas_usuarios vu
           INNER JOIN usuarios u ON vu.usuario_id = u.id_usuario
           LEFT JOIN roles r ON u.rol_id = r.id_rol
           WHERE vu.venta_id = ?`,
          [venta.id_venta]
        ) as any[];

        if (Array.isArray(anfitrionasLiberadas) && anfitrionasLiberadas.length > 0) {
          for (const anfitriona of anfitrionasLiberadas) {
            if (anfitriona.rol === 'anfitriona') {
              await query('UPDATE usuarios SET estado = 1 WHERE id_usuario = ?', [anfitriona.usuario_id]);
            }
          }
        }

        // 3. Finalizar la venta (estado 1)
        await query('UPDATE ventas SET estado = 1, fecha_mod = NOW() WHERE id_venta = ?', [venta.id_venta]);
      }
    }

    // Busca servicios activos (estado 2) cuyo temporizador ya terminó (si no están pausados)
    const expiredServicios = await query(
      `SELECT id_servicio, habitacion_id FROM servicios 
       WHERE habitacion_id IS NOT NULL 
         AND tiempo > 0 
         AND estado = 2
         AND paused_at IS NULL
         AND TIMESTAMPDIFF(MINUTE, fecha_crea, NOW()) >= tiempo`,
      []
    ) as any[];

    if (Array.isArray(expiredServicios) && expiredServicios.length > 0) {
      console.log(`[API /timers/active] Auto-limpiando ${expiredServicios.length} servicios expirados...`);
      for (const servicio of expiredServicios) {
        // 1. Finalizar el servicio (estado 1)
        await query('UPDATE servicios SET estado = 1 WHERE id_servicio = ?', [servicio.id_servicio]);

        // 2. Liberar habitación
        if (servicio.habitacion_id) {
          const roomInfo = (await query('SELECT precio, comision_anfitriona, tiempo FROM habitaciones WHERE id_habitacion = ?', [servicio.habitacion_id])) as any[];
          if (roomInfo.length > 0) {
            const room = roomInfo[0];
            const isFreeRoom = !Number(room.precio) && !Number(room.comision_anfitriona) && !Number(room.tiempo);
            if (!isFreeRoom) {
              await query('UPDATE habitaciones SET estado = 1 WHERE id_habitacion = ?', [servicio.habitacion_id]);
            }
          }
        }

        // 3. Liberar anfitrionas asociadas
        const anfitrionasServicio = await query(
          'SELECT usuario_id FROM detalle_servicios WHERE servicio_id = ?',
          [servicio.id_servicio]
        ) as any[];

        if (Array.isArray(anfitrionasServicio) && anfitrionasServicio.length > 0) {
          for (const anfitriona of anfitrionasServicio) {
            await query('UPDATE usuarios SET estado = 1 WHERE id_usuario = ?', [anfitriona.usuario_id]);
          }

          // Reanudar servicios previos pausados de estas anfitrionas
          try {
            const anfitrionasIds = anfitrionasServicio.map(a => a.usuario_id);
            const placeholders = anfitrionasIds.map(() => '?').join(',');
            const serviciosToResume = await query(`
              SELECT DISTINCT s.id_servicio, s.paused_at
              FROM servicios s
              JOIN detalle_servicios ds ON s.id_servicio = ds.servicio_id
              WHERE s.estado = 3 
                AND ds.usuario_id IN (${placeholders})
            `, [...anfitrionasIds]) as any[];

            if (serviciosToResume && serviciosToResume.length > 0) {
              for (const sToResume of serviciosToResume) {
                const checkBusy = await query('SELECT COUNT(*) as busy_count FROM detalle_servicios ds JOIN usuarios u ON ds.usuario_id = u.id_usuario WHERE ds.servicio_id = ? AND u.estado = 2', [sToResume.id_servicio]) as any[];
                if (checkBusy[0]?.busy_count === 0) {
                  await query('UPDATE servicios SET estado = 2, fecha_crea = DATE_ADD(fecha_crea, INTERVAL TIMESTAMPDIFF(SECOND, paused_at, NOW()) SECOND), paused_at = NULL WHERE id_servicio = ?', [sToResume.id_servicio]);
                  const updated = await query('SELECT fecha_crea FROM servicios WHERE id_servicio = ?', [sToResume.id_servicio]) as any[];
                  console.log(`[AUTO-CLEANUP] Servicio previo ${sToResume.id_servicio} reanudado. Nueva fecha_crea:`, updated[0]?.fecha_crea);
                  sendNotificationToAll('timer_resumed', {
                    servicioId: sToResume.id_servicio,
                    tipoTransaccion: 'servicio',
                    newStartTime: updated[0]?.fecha_crea
                  });
                }
              }
            }
          } catch (resumeErr) {
            console.error('[AUTO-CLEANUP] Error al reanudar servicios previos:', resumeErr);
          }
        }
      }
    }
    // --- FIN AUTO-CLEANUP ---

    // Obtener servicios activos
    const activeServices = await query(
      `SELECT 
        s.id_servicio,
        s.codigo,
        s.habitacion_id,
        h.nombre as habitacion_nombre,
        s.tiempo,
        s.fecha_crea,
        s.paused_at,
        s.cliente_id,
        c.nombre as cliente_nombre,
        GROUP_CONCAT(DISTINCT CONCAT(u.nombre, ' ', u.apellido) SEPARATOR ', ') as anfitrionas
      FROM servicios s
      LEFT JOIN habitaciones h ON h.id_habitacion = s.habitacion_id
      LEFT JOIN clientes c ON c.id_cliente = s.cliente_id
      LEFT JOIN detalle_servicios ds ON ds.servicio_id = s.id_servicio
      LEFT JOIN usuarios u ON u.id_usuario = ds.usuario_id
      WHERE s.estado IN (2, 3)
        AND s.tiempo > 0
        AND (s.estado = 3 OR TIMESTAMPDIFF(MINUTE, s.fecha_crea, NOW()) < s.tiempo)
      GROUP BY s.id_servicio, s.codigo, s.habitacion_id, h.nombre, s.tiempo, s.fecha_crea, s.paused_at, s.cliente_id, c.nombre
      ORDER BY s.fecha_crea DESC`,
      []
    );

    // Obtener ventas en proceso (con habitación y tiempo activo) - estado = 2
    const activeVentas = await query(
      `SELECT 
        v.id_venta,
        v.codigo,
        v.habitacion_id,
        h.nombre as habitacion_nombre,
        v.tiempo,
        v.fecha_crea,
        v.paused_at,
        v.cliente_id,
        c.nombre as cliente_nombre
      FROM ventas v
      LEFT JOIN habitaciones h ON h.id_habitacion = v.habitacion_id
      LEFT JOIN clientes c ON c.id_cliente = v.cliente_id
      WHERE v.habitacion_id IS NOT NULL 
        AND v.tiempo > 0 
        AND v.estado = 2
        AND (v.paused_at IS NOT NULL OR TIMESTAMPDIFF(MINUTE, v.fecha_crea, NOW()) < v.tiempo)
      ORDER BY v.fecha_crea DESC`,
      []
    );

    const timersData = [
      ...(Array.isArray(activeServices)
        ? activeServices.map((service: any) => ({
          servicioId: service.id_servicio,
          codigo: service.codigo,
          roomId: service.habitacion_id,
          roomName: service.habitacion_nombre || `Habitación ${service.habitacion_id}`,
          duration: service.tiempo,
          startTime: service.fecha_crea,
          clienteNombre: service.cliente_nombre || 'Cliente',
          anfitrionas: service.anfitrionas || '',
          tipoTransaccion: 'servicio' as const,
          isPaused: service.paused_at !== null
        }))
        : []),
      ...(Array.isArray(activeVentas)
        ? activeVentas.map((venta: any) => ({
          servicioId: venta.id_venta,
          codigo: venta.codigo,
          roomId: venta.habitacion_id,
          roomName: venta.habitacion_nombre || `Habitación ${venta.habitacion_id}`,
          duration: venta.tiempo,
          startTime: venta.fecha_crea,
          clienteNombre: venta.cliente_nombre || 'Cliente',
          anfitrionas: '',
          tipoTransaccion: 'venta' as const,
          isPaused: venta.paused_at !== null
        }))
        : [])
    ];

    return res.status(200).json({
      success: true,
      data: timersData,
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    console.error('[API /timers/active] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener timers activos',
      error: String(error)
    });
  }
}
