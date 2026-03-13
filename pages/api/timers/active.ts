import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { sendNotificationToAll } from '@/pages/api/notifications/sse';

/**
 * GET /api/timers/active
 * Obtiene todos los servicios y ventas activos con habitación y tiempo, con información de temporizadores
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  // Deshabilitar caché para que siempre obtenga datos reales de timers
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    // Auto-cleanup corre en background (fire-and-forget) para no bloquear la respuesta
    runAutoCleanup().catch(err => console.error('[timers/active] cleanup error:', err));

    // Obtener servicios, ventas y cuentas activos en paralelo
    const [activeServices, activeVentas, activeCuentas] = await Promise.all([
      query(
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
          s.precio_servicio,
          s.precio_habitacion,
          s.iva,
          s.total,
          s.metodo_pago,
          s.estado,
          u_creator.nick as waiter_name,
          h.comision_anfitriona as habitacion_comision,
          GROUP_CONCAT(DISTINCT u.nick SEPARATOR ', ') as anfitrionas,
          GROUP_CONCAT(DISTINCT u.id_usuario SEPARATOR ',') as anfitrionas_ids,
          CASE 
            WHEN s.paused_at IS NOT NULL THEN GREATEST(0, (s.tiempo * 60) - TIMESTAMPDIFF(SECOND, s.fecha_crea, s.paused_at))
            ELSE NULL 
          END as remaining_paused
        FROM servicios s
        LEFT JOIN habitaciones h ON h.id_habitacion = s.habitacion_id
        LEFT JOIN clientes c ON c.id_cliente = s.cliente_id
        LEFT JOIN detalle_servicios ds ON ds.servicio_id = s.id_servicio
        LEFT JOIN usuarios u ON u.id_usuario = ds.usuario_id
        LEFT JOIN usuarios u_creator ON u_creator.id_usuario = s.created_by
        WHERE s.estado NOT IN (0, 1, 4)
          AND s.tiempo > 0
          AND (s.estado = 3 OR TIMESTAMPDIFF(MINUTE, s.fecha_crea, NOW()) < s.tiempo)
        GROUP BY s.id_servicio, s.codigo, s.habitacion_id, h.nombre, s.tiempo, s.fecha_crea, s.paused_at, s.cliente_id, c.nombre, s.precio_servicio, s.precio_habitacion, s.iva, s.total, s.metodo_pago, s.estado, u_creator.nick, h.comision_anfitriona
        ORDER BY s.fecha_crea DESC`,
        []
      ),
      query(
        `SELECT 
          v.id_venta,
          v.codigo,
          v.habitacion_id,
          h.nombre as habitacion_nombre,
          v.tiempo,
          v.fecha_crea,
          v.paused_at,
          v.cliente_id,
          c.nombre as cliente_nombre,
          v.total,
          v.sub_total,
          v.metodo_pago,
          v.estado,
          u_creator.nick as waiter_name,
          GROUP_CONCAT(DISTINCT u.nick SEPARATOR ', ') as anfitrionas,
          CASE 
            WHEN v.paused_at IS NOT NULL THEN GREATEST(0, (v.tiempo * 60) - TIMESTAMPDIFF(SECOND, v.fecha_crea, v.paused_at))
            ELSE NULL 
          END as remaining_paused
        FROM ventas v
        LEFT JOIN habitaciones h ON h.id_habitacion = v.habitacion_id
        LEFT JOIN clientes c ON c.id_cliente = v.cliente_id
        LEFT JOIN ventas_usuarios vu ON vu.venta_id = v.id_venta
        LEFT JOIN usuarios u ON u.id_usuario = vu.usuario_id
        LEFT JOIN usuarios u_creator ON u_creator.id_usuario = v.created_by
        WHERE v.habitacion_id IS NOT NULL 
          AND v.tiempo > 0 
          AND v.estado = 2
          AND (v.paused_at IS NOT NULL OR TIMESTAMPDIFF(MINUTE, v.fecha_crea, NOW()) < v.tiempo)
        GROUP BY v.id_venta, v.codigo, v.habitacion_id, h.nombre, v.tiempo, v.fecha_crea, v.paused_at, v.cliente_id, c.nombre, v.total, v.sub_total, v.metodo_pago, v.estado, u_creator.nick
        ORDER BY v.fecha_crea DESC`,
        []
      ),
      query(
        `SELECT 
          c.id_cuenta,
          c.codigo,
          c.habitacion_id,
          h.nombre as habitacion_nombre,
          c.tiempo,
          c.fecha_crea,
          c.cliente_id,
          cl.nombre as cliente_nombre,
          c.total,
          c.sub_total,
          c.estado,
          GROUP_CONCAT(DISTINCT u.nick SEPARATOR ', ') as anfitrionas
        FROM cuentas c
        LEFT JOIN habitaciones h ON h.id_habitacion = c.habitacion_id
        LEFT JOIN clientes cl ON cl.id_cliente = c.cliente_id
        LEFT JOIN cuentas_usuarios cu ON cu.cuenta_id = c.id_cuenta
        LEFT JOIN usuarios u ON u.id_usuario = cu.usuario_id
        WHERE c.habitacion_id IS NOT NULL 
          AND c.tiempo > 0 
          AND c.estado = 1
        GROUP BY c.id_cuenta, c.codigo, c.habitacion_id, h.nombre, c.tiempo, c.fecha_crea, c.cliente_id, cl.nombre, c.total, c.sub_total, c.estado
        ORDER BY c.fecha_crea DESC`,
        []
      )
    ]);



    const timersData = [
      ...(Array.isArray(activeServices)
        ? activeServices.map((service: any) => ({
          servicioId: service.id_servicio,
          codigo: service.codigo,
          roomId: service.habitacion_id,
          roomName: service.habitacion_nombre || `Habitación ${service.habitacion_id}`,
          duration: service.tiempo,
          startTime: service.fecha_crea,
          remainingTime: service.remaining_paused !== null ? service.remaining_paused : 0,
          clienteNombre: service.cliente_nombre || 'Cliente',
          anfitrionas: service.anfitrionas || '',
          tipoTransaccion: 'servicio' as const,
          isPaused: service.paused_at !== null,
          precio_servicio: service.precio_servicio,
          precio_habitacion: service.precio_habitacion,
          iva: service.iva,
          total: service.total,
          metodo_pago: service.metodo_pago,
          waiter_name: service.waiter_name,
          habitacion_comision: service.habitacion_comision || 0,
          anfitrionas_ids: service.anfitrionas_ids
            ? service.anfitrionas_ids.split(',').map(Number)
            : [],
          created_at: service.fecha_crea,
          estado: service.estado
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
          remainingTime: venta.remaining_paused !== null ? venta.remaining_paused : 0,
          clienteNombre: venta.cliente_nombre || 'Cliente',
          anfitrionas: venta.anfitrionas || '',
          tipoTransaccion: 'venta' as const,
          isPaused: venta.paused_at !== null,
          precio_servicio: 0,
          precio_habitacion: 0,
          iva: venta.total - (venta.sub_total || venta.total),
          total: venta.total,
          metodo_pago: venta.metodo_pago,
          waiter_name: venta.waiter_name,
          created_at: venta.fecha_crea,
          estado: venta.estado
        }))
        : []),
      ...(Array.isArray(activeCuentas)
        ? activeCuentas.map((cuenta: any) => ({
          servicioId: cuenta.id_cuenta,
          codigo: cuenta.codigo,
          roomId: cuenta.habitacion_id,
          roomName: cuenta.habitacion_nombre || `Habitación ${cuenta.habitacion_id}`,
          duration: cuenta.tiempo,
          startTime: cuenta.fecha_crea,
          remainingTime: 0,
          clienteNombre: cuenta.cliente_nombre || 'Cliente',
          anfitrionas: cuenta.anfitrionas || '',
          tipoTransaccion: 'cuenta' as const,
          isPaused: false,
          precio_servicio: 0,
          precio_habitacion: 0,
          iva: 0,
          total: cuenta.total,
          metodo_pago: 'efectivo',
          waiter_name: 'Admin',
          created_at: cuenta.fecha_crea,
          estado: cuenta.estado
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

// ─── Auto-cleanup (ejecutado en background, no bloquea la respuesta) ────────
async function runAutoCleanup() {
  // Ventas expiradas
  const expiredVentas = (await query(
    `SELECT id_venta, habitacion_id FROM ventas 
     WHERE habitacion_id IS NOT NULL 
       AND tiempo > 0 AND estado = 2 AND paused_at IS NULL
       AND TIMESTAMPDIFF(MINUTE, fecha_crea, NOW()) >= tiempo`
  )) as any[];

  for (const venta of (expiredVentas || [])) {
    const habitacionId = venta.habitacion_id;
    await query('UPDATE ventas SET estado = 1, fecha_mod = NOW() WHERE id_venta = ?', [venta.id_venta]);

    // Buscar timers pausados (servicios o ventas)
    const [vPausada] = (await query('SELECT id_venta, paused_at FROM ventas WHERE habitacion_id = ? AND estado = 3 ORDER BY paused_at DESC LIMIT 1', [habitacionId])) as any[];
    const [sPausado] = (await query('SELECT id_servicio, paused_at FROM servicios WHERE habitacion_id = ? AND estado = 3 ORDER BY paused_at DESC LIMIT 1', [habitacionId])) as any[];

    if (vPausada || sPausado) {
      const resumeVenta = vPausada && (!sPausado || new Date(vPausada.paused_at) >= new Date(sPausado.paused_at));
      if (resumeVenta) {
        await query('UPDATE ventas SET estado = 2, fecha_crea = DATE_ADD(fecha_crea, INTERVAL TIMESTAMPDIFF(SECOND, paused_at, NOW()) SECOND), paused_at = NULL WHERE id_venta = ?', [vPausada.id_venta]);
        const [sr] = (await query('SELECT fecha_crea FROM ventas WHERE id_venta = ?', [vPausada.id_venta])) as any[];
        sendNotificationToAll('timer_resumed', { servicioId: vPausada.id_venta, tipoTransaccion: 'venta', newStartTime: sr.fecha_crea });
      } else {
        await query('UPDATE servicios SET estado = 2, fecha_crea = DATE_ADD(fecha_crea, INTERVAL TIMESTAMPDIFF(SECOND, paused_at, NOW()) SECOND), paused_at = NULL WHERE id_servicio = ?', [sPausado.id_servicio]);
        const [sr] = (await query('SELECT fecha_crea FROM servicios WHERE id_servicio = ?', [sPausado.id_servicio])) as any[];
        sendNotificationToAll('timer_resumed', { servicioId: sPausado.id_servicio, tipoTransaccion: 'servicio', newStartTime: sr.fecha_crea });
      }
    } else if (habitacionId) {
      const [room] = (await query('SELECT precio, comision_anfitriona, tiempo FROM habitaciones WHERE id_habitacion = ?', [habitacionId])) as any[];
      if (room && (Number(room.precio) || Number(room.comision_anfitriona) || Number(room.tiempo))) {
        await query('UPDATE habitaciones SET estado = 1 WHERE id_habitacion = ?', [habitacionId]);
      }
    }

    const anfs = (await query('SELECT usuario_id FROM ventas_usuarios WHERE venta_id = ?', [venta.id_venta])) as any[];
    for (const a of (anfs || [])) {
      await query(
        `UPDATE usuarios SET estado_servicio = 1 WHERE id_usuario = ?
         AND id_usuario NOT IN (SELECT usuario_id FROM detalle_servicios ds JOIN servicios s ON ds.servicio_id = s.id_servicio WHERE s.estado IN (2,4))
         AND id_usuario NOT IN (SELECT usuario_id FROM ventas_usuarios vu JOIN ventas v ON vu.venta_id = v.id_venta WHERE v.estado = 2 AND v.id_venta != ?)`,
        [a.usuario_id, venta.id_venta]
      );
    }
    sendNotificationToAll('timer_stopped', { servicioId: venta.id_venta, tipoTransaccion: 'venta', roomId: habitacionId });
  }

  // Servicios expirados
  const expiredServicios = (await query(
    `SELECT id_servicio, habitacion_id FROM servicios 
     WHERE habitacion_id IS NOT NULL 
       AND tiempo > 0 AND estado = 2 AND paused_at IS NULL
       AND TIMESTAMPDIFF(MINUTE, fecha_crea, NOW()) >= tiempo`
  )) as any[];

  for (const servicio of (expiredServicios || [])) {
    const habitacionId = servicio.habitacion_id;
    await query('UPDATE servicios SET estado = 1 WHERE id_servicio = ?', [servicio.id_servicio]);

    // Buscar timers pausados (servicios o ventas)
    const [vPausada] = (await query('SELECT id_venta, paused_at FROM ventas WHERE habitacion_id = ? AND estado = 3 ORDER BY paused_at DESC LIMIT 1', [habitacionId])) as any[];
    const [sPausado] = (await query('SELECT id_servicio, paused_at FROM servicios WHERE habitacion_id = ? AND estado = 3 AND id_servicio != ? ORDER BY paused_at DESC LIMIT 1', [habitacionId, servicio.id_servicio])) as any[];

    if (vPausada || sPausado) {
      const resumeVenta = vPausada && (!sPausado || new Date(vPausada.paused_at) >= new Date(sPausado.paused_at));
      if (resumeVenta) {
        await query('UPDATE ventas SET estado = 2, fecha_crea = DATE_ADD(fecha_crea, INTERVAL TIMESTAMPDIFF(SECOND, paused_at, NOW()) SECOND), paused_at = NULL WHERE id_venta = ?', [vPausada.id_venta]);
        const [sr] = (await query('SELECT fecha_crea FROM ventas WHERE id_venta = ?', [vPausada.id_venta])) as any[];
        sendNotificationToAll('timer_resumed', { servicioId: vPausada.id_venta, tipoTransaccion: 'venta', newStartTime: sr.fecha_crea });
      } else {
        await query('UPDATE servicios SET estado = 2, fecha_crea = DATE_ADD(fecha_crea, INTERVAL TIMESTAMPDIFF(SECOND, paused_at, NOW()) SECOND), paused_at = NULL WHERE id_servicio = ?', [sPausado.id_servicio]);
        const [sr] = (await query('SELECT fecha_crea FROM servicios WHERE id_servicio = ?', [sPausado.id_servicio])) as any[];
        sendNotificationToAll('timer_resumed', { servicioId: sPausado.id_servicio, tipoTransaccion: 'servicio', newStartTime: sr.fecha_crea });
      }
    } else if (habitacionId) {
      const [room] = (await query('SELECT precio, comision_anfitriona, tiempo FROM habitaciones WHERE id_habitacion = ?', [habitacionId])) as any[];
      if (room && (Number(room.precio) || Number(room.comision_anfitriona) || Number(room.tiempo))) {
        await query('UPDATE habitaciones SET estado = 1 WHERE id_habitacion = ?', [habitacionId]);
      }
    }

    const anfs = (await query('SELECT usuario_id FROM detalle_servicios WHERE servicio_id = ?', [servicio.id_servicio])) as any[];
    for (const a of (anfs || [])) {
      await query(
        `UPDATE usuarios SET estado_servicio = 1 WHERE id_usuario = ?
         AND id_usuario NOT IN (SELECT usuario_id FROM detalle_servicios ds JOIN servicios s ON ds.servicio_id = s.id_servicio WHERE s.estado IN (2,4) AND s.id_servicio != ?)
         AND id_usuario NOT IN (SELECT usuario_id FROM ventas_usuarios vu JOIN ventas v ON vu.venta_id = v.id_venta WHERE v.estado = 2)`,
        [a.usuario_id, servicio.id_servicio]
      );
    }
    sendNotificationToAll('timer_stopped', { servicioId: servicio.id_servicio, tipoTransaccion: 'servicio', roomId: habitacionId });
  }

  // Cuentas expiradas (liberar habitación y anfitrionas al expirar)
  const expiredCuentas = (await query(
    `SELECT id_cuenta, habitacion_id FROM cuentas 
     WHERE habitacion_id IS NOT NULL 
       AND tiempo > 0 AND estado = 1
       AND TIMESTAMPDIFF(MINUTE, fecha_crea, NOW()) >= tiempo`
  )) as any[];

  for (const cuenta of (expiredCuentas || [])) {
    const habitacionId = cuenta.habitacion_id;

    // 1. Liberar habitación si no es libre y no hay otros servicios activos en ella
    if (habitacionId) {
      const [room] = (await query('SELECT precio, comision_anfitriona, tiempo FROM habitaciones WHERE id_habitacion = ?', [habitacionId])) as any[];
      if (room && (Number(room.precio) || Number(room.comision_anfitriona) || Number(room.tiempo))) {
        await query('UPDATE habitaciones SET estado = 1 WHERE id_habitacion = ?', [habitacionId]);
      }
    }

    // 2. Liberar anfitrionas
    const anfs = (await query('SELECT usuario_id FROM cuentas_usuarios WHERE cuenta_id = ?', [cuenta.id_cuenta])) as any[];
    for (const a of (anfs || [])) {
      await query(
        `UPDATE usuarios SET estado_servicio = 1 WHERE id_usuario = ?
         AND id_usuario NOT IN (SELECT usuario_id FROM detalle_servicios ds JOIN servicios s ON ds.servicio_id = s.id_servicio WHERE s.estado IN (2,4))
         AND id_usuario NOT IN (SELECT usuario_id FROM ventas_usuarios vu JOIN ventas v ON vu.venta_id = v.id_venta WHERE v.estado = 2)
         AND id_usuario NOT IN (SELECT usuario_id FROM cuentas_usuarios cu JOIN cuentas c ON cu.cuenta_id = c.id_cuenta WHERE c.estado = 1 AND c.id_cuenta != ? AND TIMESTAMPDIFF(MINUTE, c.fecha_crea, NOW()) < c.tiempo)`,
        [a.usuario_id, cuenta.id_cuenta]
      );

      // Notificar disponibilidad por SSE
      sendNotificationToAll('user_status_updated', {
        userId: a.usuario_id,
        status: 1 // Disponible
      });
    }

    sendNotificationToAll('timer_stopped', { servicioId: cuenta.id_cuenta, tipoTransaccion: 'cuenta', roomId: habitacionId });
  }
}
