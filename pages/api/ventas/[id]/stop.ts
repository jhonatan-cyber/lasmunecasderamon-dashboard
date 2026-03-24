/* eslint-disable */
import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { sendNotificationToAll } from '../../notifications/sse';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { id } = req.query;
  const ventaId = id as string;

  if (!ventaId) {
    return res.status(400).json({ error: 'ID de venta inválido' });
  }

  try {
    const ventaExistente = (await query('SELECT * FROM ventas WHERE id_venta = ?', [
      ventaId
    ])) as Array<Record<string, unknown>>;

    if (ventaExistente.length === 0) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    const venta = ventaExistente[0] as { habitacion_id?: string | number | null; estado?: number }
    const habitacionId = venta.habitacion_id as string | number | null | undefined;

    // 1. Finalizar la venta (estado 1)
    await query('UPDATE ventas SET estado = 1, fecha_mod = NOW() WHERE id_venta = ?', [ventaId]);

    // 2. Verificar si hay servicios pausados en la misma habitación
      if (habitacionId) {
        // 2a. Buscar VENTA pausada
        const ventasPausadas = await query(
          'SELECT id_venta, paused_at FROM ventas WHERE habitacion_id = ? AND estado = 3 ORDER BY paused_at DESC LIMIT 1',
          [habitacionId]
        ) as Array<Record<string, unknown>>;

        // 2b. Buscar SERVICIO pausado
        const serviciosPausados = await query(
          'SELECT id_servicio, paused_at FROM servicios WHERE habitacion_id = ? AND estado = 3 ORDER BY paused_at DESC LIMIT 1',
          [habitacionId]
        ) as Array<Record<string, unknown>>;

        const vPausada = ventasPausadas.length > 0 ? ventasPausadas[0] : null;
        const sPausado = serviciosPausados.length > 0 ? serviciosPausados[0] : null;

        if (vPausada || sPausado) {
          // Reanudar el que se pausó más recientemente (o priorizar venta si tienen mismo tiempo)
          const resumeVenta = Boolean(vPausada && (!sPausado || new Date(String(vPausada.paused_at)) >= new Date(String(sPausado.paused_at))));

          if (resumeVenta && vPausada) {
            console.log(`[STOP-VENTA] Reanudando VENTA pausada ${vPausada.id_venta}`);
            await query(
              'UPDATE ventas SET estado = 2, fecha_crea = DATE_ADD(fecha_crea, INTERVAL TIMESTAMPDIFF(SECOND, paused_at, NOW()) SECOND), paused_at = NULL WHERE id_venta = ?',
              [vPausada.id_venta]
            );
            const [reanudada] = await query('SELECT fecha_crea FROM ventas WHERE id_venta = ?', [vPausada.id_venta]) as Array<Record<string, unknown>>;
            sendNotificationToAll('timer_resumed', { servicioId: vPausada.id_venta, tipoTransaccion: 'venta', newStartTime: reanudada.fecha_crea });
          } else if (sPausado) {
            console.log(`[STOP-VENTA] Reanudando SERVICIO pausado ${sPausado.id_servicio}`);
            await query(
              'UPDATE servicios SET estado = 2, fecha_crea = DATE_ADD(fecha_crea, INTERVAL TIMESTAMPDIFF(SECOND, paused_at, NOW()) SECOND), paused_at = NULL WHERE id_servicio = ?',
              [sPausado.id_servicio]
            );
            const [reanudado] = await query('SELECT fecha_crea FROM servicios WHERE id_servicio = ?', [sPausado.id_servicio]) as Array<Record<string, unknown>>;
            sendNotificationToAll('timer_resumed', { servicioId: sPausado.id_servicio, tipoTransaccion: 'servicio', newStartTime: reanudado.fecha_crea });
          }
        } else {
        // No hay servicios pausados, liberar habitación
        const roomInfo = (await query('SELECT precio, comision_anfitriona, tiempo FROM habitaciones WHERE id_habitacion = ?', [habitacionId])) as Array<Record<string, unknown>>;
        if (roomInfo.length > 0) {
          const room = roomInfo[0] as { precio?: unknown; comision_anfitriona?: unknown; tiempo?: unknown }
          const isFreeRoom = !Number(room.precio) && !Number(room.comision_anfitriona) && !Number(room.tiempo);
          if (!isFreeRoom) {
            await query('UPDATE habitaciones SET estado = 1 WHERE id_habitacion = ?', [habitacionId]);
          }
        }
      }
    }

    // 3. Liberar anfitrionas asociadas (solo si no están en otro servicio activo)
    const anfitrionasLiberadas = (await query(
      'SELECT usuario_id FROM ventas_usuarios WHERE venta_id = ?',
      [ventaId]
    )) as Array<Record<string, unknown>>;

    if (anfitrionasLiberadas.length > 0) {
      for (const anfitriona of anfitrionasLiberadas) {
        await query(`
          UPDATE usuarios SET estado_servicio = 1 
          WHERE id_usuario = ? 
          AND id_usuario NOT IN (SELECT usuario_id FROM detalle_servicios ds JOIN servicios s ON ds.servicio_id = s.id_servicio WHERE s.estado IN (2, 3, 4))
          AND id_usuario NOT IN (SELECT usuario_id FROM ventas_usuarios vu JOIN ventas v ON vu.venta_id = v.id_venta WHERE v.estado = 2 AND v.id_venta != ?)
        `, [anfitriona.usuario_id, ventaId]);
      }
    }

    if (venta.habitacion_id) {
      const habitacionInfo = (await query(
        'SELECT nombre FROM habitaciones WHERE id_habitacion = ?',
        [venta.habitacion_id]
      )) as Array<Record<string, unknown>>;

      const nombreHabitacion =
        habitacionInfo && habitacionInfo.length > 0
          ? habitacionInfo[0].nombre
          : `Habitación ${venta.habitacion_id}`;

      sendNotificationToAll('timer_stopped', {
        servicioId: ventaId,
        roomId: venta.habitacion_id,
        roomName: nombreHabitacion,
        reason: 'Venta finalizada manualmente',
        tipoTransaccion: 'venta'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Venta finalizada, habitación liberada',
      ventaId,
      habitacionLiberada: !!venta.habitacion_id,
      anfitrionasLiberadas: anfitrionasLiberadas.length
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}


