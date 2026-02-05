import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { sendNotificationToAll } from '../../notifications/sse';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  try {
    const { id } = req.query;

    if (!id || Array.isArray(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de venta es requerido'
      });
    }

    const ventaId = parseInt(id);

    // Obtener información de la venta
    const ventasResult = await query(
      'SELECT id_venta, habitacion_id FROM ventas WHERE id_venta = ?',
      [ventaId]
    ) as any[];

    if (!ventasResult || ventasResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Venta no encontrada'
      });
    }

    const venta = ventasResult[0];

    // Actualizar estado de la venta a finalizada (estado = 0)
    await query('UPDATE ventas SET estado = 0, fecha_mod = NOW() WHERE id_venta = ?', [ventaId]);

    // Si la venta tenía habitación, liberar la habitación
    if (venta.habitacion_id) {
      await query('UPDATE habitaciones SET estado = 1 WHERE id_habitacion = ?', [venta.habitacion_id]);
      console.log(`✅ Habitación ${venta.habitacion_id} liberada por finalización de venta ${ventaId}`);

      // Enviar notificación SSE para sincronizar detención de timer
      sendNotificationToAll('timer_stopped', {
        servicioId: ventaId,
        roomId: venta.habitacion_id
      });
      console.log(`📢 Notificación timer_stopped enviada para venta ${ventaId}`);
    }

    return res.status(200).json({
      success: true,
      message: 'Venta finalizada exitosamente'
    });
  } catch (error) {
    console.error('Error al finalizar venta:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al finalizar venta'
    });
  }
}
