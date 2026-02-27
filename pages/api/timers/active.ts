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
    // --- AUTO-CLEANUP DE VENTAS EXPIRADAS ---
    // Busca ventas en proceso (estado 2) cuyo temporizador ya terminó
    const expiredVentas = (await query(
      `SELECT id_venta, habitacion_id FROM ventas 
       WHERE habitacion_id IS NOT NULL 
         AND tiempo > 0 
         AND estado = 2
         AND paused_at IS NULL
         AND TIMESTAMPDIFF(MINUTE, fecha_crea, NOW()) >= tiempo`,
      []
    )) as any[];

    if (Array.isArray(expiredVentas) && expiredVentas.length > 0) {
      console.log(
        `[API /timers/active] Auto-limpiando ${expiredVentas.length} ventas expiradas...`
      );
      for (const venta of expiredVentas) {
        const habitacionId = venta.habitacion_id;

        // 1. Finalizar la venta (estado 1)
        await query('UPDATE ventas SET estado = 1, fecha_mod = NOW() WHERE id_venta = ?', [
          venta.id_venta
        ]);

        // 2. Verificar si hay servicios pausados en la misma habitación
        const serviciosPausados = (await query(
          'SELECT id_servicio, paused_at FROM servicios WHERE habitacion_id = ? AND estado = 3 ORDER BY paused_at ASC LIMIT 1',
          [habitacionId]
        )) as any[];

        if (serviciosPausados && serviciosPausados.length > 0) {
          // Hay un servicio pausado, reanudarlo
          const servicioPausado = serviciosPausados[0];
          console.log(
            `[AUTO-CLEANUP] Venta ${venta.id_venta} finalizada. Reanudando servicio pausado ${servicioPausado.id_servicio} en habitación ${habitacionId}`
          );

          await query(
            'UPDATE servicios SET estado = 2, paused_at = NULL, fecha_crea = DATE_ADD(fecha_crea, INTERVAL TIMESTAMPDIFF(SECOND, paused_at, NOW()) SECOND) WHERE id_servicio = ?',
            [servicioPausado.id_servicio]
          );

          const [servicioReanudado] = (await query(
            'SELECT fecha_crea FROM servicios WHERE id_servicio = ?',
            [servicioPausado.id_servicio]
          )) as any[];

          sendNotificationToAll('timer_resumed', {
            servicioId: servicioPausado.id_servicio,
            tipoTransaccion: 'servicio',
            newStartTime: servicioReanudado.fecha_crea
          });
        } else if (habitacionId) {
          // No hay servicios pausados, liberar habitación
          const roomInfo = (await query(
            'SELECT precio, comision_anfitriona, tiempo FROM habitaciones WHERE id_habitacion = ?',
            [habitacionId]
          )) as any[];
          if (roomInfo.length > 0) {
            const room = roomInfo[0];
            const isFreeRoom =
              !Number(room.precio) && !Number(room.comision_anfitriona) && !Number(room.tiempo);
            if (!isFreeRoom) {
              await query('UPDATE habitaciones SET estado = 1 WHERE id_habitacion = ?', [
                habitacionId
              ]);
            }
          }
        }

        // 3. Liberar anfitrionas asociadas (solo si no están en otro servicio activo)
        const anfitrionasLiberadas = (await query(
          'SELECT usuario_id FROM ventas_usuarios WHERE venta_id = ?',
          [venta.id_venta]
        )) as any[];

        if (Array.isArray(anfitrionasLiberadas) && anfitrionasLiberadas.length > 0) {
          for (const anfitriona of anfitrionasLiberadas) {
            await query(
              `
              UPDATE usuarios SET estado = 1 
              WHERE id_usuario = ? 
              AND id_usuario NOT IN (SELECT usuario_id FROM detalle_servicios ds JOIN servicios s ON ds.servicio_id = s.id_servicio WHERE s.estado IN (2, 4))
              AND id_usuario NOT IN (SELECT usuario_id FROM ventas_usuarios vu JOIN ventas v ON vu.venta_id = v.id_venta WHERE v.estado = 2 AND v.id_venta != ?)
            `,
              [anfitriona.usuario_id, venta.id_venta]
            );
          }
        }

        // 4. Notificar a los clientes
        sendNotificationToAll('timer_stopped', {
          servicioId: venta.id_venta,
          tipoTransaccion: 'venta',
          roomId: habitacionId
        });
      }
    }

    // Busca servicios activos (estado 2) cuyo temporizador ya terminó (si no están pausados)
    const expiredServicios = (await query(
      `SELECT id_servicio, habitacion_id FROM servicios 
       WHERE habitacion_id IS NOT NULL 
         AND tiempo > 0 
         AND estado = 2
         AND paused_at IS NULL
         AND TIMESTAMPDIFF(MINUTE, fecha_crea, NOW()) >= tiempo`,
      []
    )) as any[];

    if (Array.isArray(expiredServicios) && expiredServicios.length > 0) {
      console.log(
        `[API /timers/active] Auto-limpiando ${expiredServicios.length} servicios expirados...`
      );
      for (const servicio of expiredServicios) {
        const habitacionId = servicio.habitacion_id;

        // 1. Finalizar el servicio (estado 1)
        await query('UPDATE servicios SET estado = 1 WHERE id_servicio = ?', [
          servicio.id_servicio
        ]);

        // 2. Verificar si hay servicios pausados en la misma habitación
        const serviciosPausados = (await query(
          'SELECT id_servicio, paused_at FROM servicios WHERE habitacion_id = ? AND estado = 3 AND id_servicio != ? ORDER BY paused_at ASC LIMIT 1',
          [habitacionId, servicio.id_servicio]
        )) as any[];

        if (serviciosPausados && serviciosPausados.length > 0) {
          // Hay un servicio pausado en la misma habitación, reanudarlo
          const servicioPausado = serviciosPausados[0];

          console.log(
            `[AUTO-CLEANUP] Servicio ${servicio.id_servicio} finalizado automáticamente. Reanudando servicio pausado ${servicioPausado.id_servicio} en habitación ${habitacionId}`
          );

          // Reanudar el servicio pausado (cambiar a estado 2: En Proceso)
          await query(
            'UPDATE servicios SET estado = 2, paused_at = NULL, fecha_crea = DATE_ADD(fecha_crea, INTERVAL TIMESTAMPDIFF(SECOND, paused_at, NOW()) SECOND) WHERE id_servicio = ?',
            [servicioPausado.id_servicio]
          );

          // Obtener la nueva fecha_crea para el timer
          const [servicioReanudado] = (await query(
            'SELECT fecha_crea FROM servicios WHERE id_servicio = ?',
            [servicioPausado.id_servicio]
          )) as any[];

          // Notificar reanudación del servicio pausado
          sendNotificationToAll('timer_resumed', {
            servicioId: servicioPausado.id_servicio,
            tipoTransaccion: 'servicio',
            newStartTime: servicioReanudado.fecha_crea
          });

          console.log(
            `[AUTO-CLEANUP] Servicio ${servicioPausado.id_servicio} reanudado. Habitación ${habitacionId} sigue ocupada.`
          );
        } else {
          // No hay servicios pausados, liberar la habitación
          if (habitacionId) {
            const roomInfo = (await query(
              'SELECT precio, comision_anfitriona, tiempo FROM habitaciones WHERE id_habitacion = ?',
              [habitacionId]
            )) as any[];
            if (roomInfo.length > 0) {
              const room = roomInfo[0];
              const isFreeRoom =
                !Number(room.precio) && !Number(room.comision_anfitriona) && !Number(room.tiempo);
              if (!isFreeRoom) {
                await query('UPDATE habitaciones SET estado = 1 WHERE id_habitacion = ?', [
                  habitacionId
                ]);
              }
            }
          }
          console.log(
            `[AUTO-CLEANUP] No hay servicios pausados. Habitación ${habitacionId} liberada.`
          );
        }

        // 3. Liberar anfitrionas asociadas (solo si no están en otro servicio activo)
        const anfitrionasServicio = (await query(
          'SELECT usuario_id FROM detalle_servicios WHERE servicio_id = ?',
          [servicio.id_servicio]
        )) as any[];

        if (Array.isArray(anfitrionasServicio) && anfitrionasServicio.length > 0) {
          for (const anfitriona of anfitrionasServicio) {
            await query(
              `
              UPDATE usuarios SET estado = 1 
              WHERE id_usuario = ? 
              AND id_usuario NOT IN (SELECT usuario_id FROM detalle_servicios ds JOIN servicios s ON ds.servicio_id = s.id_servicio WHERE s.estado IN (2, 4) AND s.id_servicio != ?)
              AND id_usuario NOT IN (SELECT usuario_id FROM ventas_usuarios vu JOIN ventas v ON vu.venta_id = v.id_venta WHERE v.estado = 2)
            `,
              [anfitriona.usuario_id, servicio.id_servicio]
            );
          }
        }

        // 4. Notificar a los clientes
        sendNotificationToAll('timer_stopped', {
          servicioId: servicio.id_servicio,
          tipoTransaccion: 'servicio',
          roomId: habitacionId
        });
      }
    }
    // --- FIN AUTO-CLEANUP ---

    // Obtener servicios activos con información financiera
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
            precio_servicio: 0, // Las ventas no suelen tener este desglose aquí
            precio_habitacion: 0,
            iva: venta.total - (venta.sub_total || venta.total),
            total: venta.total,
            metodo_pago: venta.metodo_pago,
            waiter_name: venta.waiter_name,
            created_at: venta.fecha_crea,
            estado: venta.estado
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
