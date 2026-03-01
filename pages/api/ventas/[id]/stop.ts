import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { sendNotificationToAll } from '../../notifications/sse';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { id } = req.query;
  const ventaId = parseInt(id as string);

  if (isNaN(ventaId)) {
    return res.status(400).json({ error: 'ID de venta inválido' });
  }

  try {
    const ventaExistente = (await query('SELECT * FROM ventas WHERE id_venta = ?', [
      ventaId
    ])) as any[];

    if (ventaExistente.length === 0) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    const venta = ventaExistente[0];
    const habitacionId = venta.habitacion_id;

    // 1. Finalizar la venta (estado 1)
    await query('UPDATE ventas SET estado = 1, fecha_mod = NOW() WHERE id_venta = ?', [ventaId]);

    // 2. Verificar si hay servicios pausados en la misma habitación
    if (habitacionId) {
      const serviciosPausados = await query(
        'SELECT id_servicio, paused_at FROM servicios WHERE habitacion_id = ? AND estado = 3 ORDER BY paused_at ASC LIMIT 1',
        [habitacionId]
      ) as any[];

      if (serviciosPausados && serviciosPausados.length > 0) {
        // Hay un servicio pausado, reanudarlo
        const servicioPausado = serviciosPausados[0];
        console.log(`[STOP-VENTA] Venta ${ventaId} finalizada. Reanudando servicio pausado ${servicioPausado.id_servicio} en habitación ${habitacionId}`);

        await query(
          'UPDATE servicios SET estado = 2, paused_at = NULL, fecha_crea = DATE_ADD(fecha_crea, INTERVAL TIMESTAMPDIFF(SECOND, paused_at, NOW()) SECOND) WHERE id_servicio = ?',
          [servicioPausado.id_servicio]
        );

        const [servicioReanudado] = await query('SELECT fecha_crea FROM servicios WHERE id_servicio = ?', [servicioPausado.id_servicio]) as any[];

        sendNotificationToAll('timer_resumed', {
          servicioId: servicioPausado.id_servicio,
          tipoTransaccion: 'servicio',
          newStartTime: servicioReanudado.fecha_crea
        });
      } else {
        // No hay servicios pausados, liberar habitación
        const roomInfo = (await query('SELECT precio, comision_anfitriona, tiempo FROM habitaciones WHERE id_habitacion = ?', [habitacionId])) as any[];
        if (roomInfo.length > 0) {
          const room = roomInfo[0];
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
    )) as any[];

    if (anfitrionasLiberadas.length > 0) {
      for (const anfitriona of anfitrionasLiberadas) {
        await query(`
          UPDATE usuarios SET estado_servicio = 1 
          WHERE id_usuario = ? 
          AND id_usuario NOT IN (SELECT usuario_id FROM detalle_servicios ds JOIN servicios s ON ds.servicio_id = s.id_servicio WHERE s.estado IN (2, 4))
          AND id_usuario NOT IN (SELECT usuario_id FROM ventas_usuarios vu JOIN ventas v ON vu.venta_id = v.id_venta WHERE v.estado = 2 AND v.id_venta != ?)
        `, [anfitriona.usuario_id, ventaId]);
      }
    }

    if (venta.habitacion_id) {
      const habitacionInfo = (await query(
        'SELECT nombre FROM habitaciones WHERE id_habitacion = ?',
        [venta.habitacion_id]
      )) as any[];

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
