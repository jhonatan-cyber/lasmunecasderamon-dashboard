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
    if (venta.habitacion_id) {
      const roomInfo = (await query('SELECT precio, comision_anfitriona, tiempo FROM habitaciones WHERE id_habitacion = ?', [venta.habitacion_id])) as any[];
      if (roomInfo.length > 0) {
        const room = roomInfo[0];
        const isFreeRoom = !Number(room.precio) && !Number(room.comision_anfitriona) && !Number(room.tiempo);
        if (!isFreeRoom) {
          await query('UPDATE habitaciones SET estado = 1 WHERE id_habitacion = ?', [
            venta.habitacion_id
          ]);
        }
      }
    }

    const anfitrionasLiberadas = (await query(
      `SELECT vu.usuario_id, r.nombre as rol 
       FROM ventas_usuarios vu
       INNER JOIN usuarios u ON vu.usuario_id = u.id_usuario
       LEFT JOIN roles r ON u.rol_id = r.id_rol
       WHERE vu.venta_id = ?`,
      [ventaId]
    )) as any[];

    if (anfitrionasLiberadas.length > 0) {
      for (const anfitriona of anfitrionasLiberadas) {
        if (anfitriona.rol === 'anfitriona') {
          await query('UPDATE usuarios SET estado = 1 WHERE id_usuario = ?', [
            anfitriona.usuario_id
          ]);
        }
      }
    }

    await query('UPDATE ventas SET estado = 1, fecha_mod = NOW() WHERE id_venta = ?', [ventaId]);

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
