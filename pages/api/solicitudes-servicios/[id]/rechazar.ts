/* eslint-disable */
import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { sendNotificationToAll } from '../../notifications/sse';
import { sendPushNotification } from '@/lib/pushNotifications';


const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  try {
    const { id } = req.query;
    const { motivo_rechazo } = req.body;
    // @ts-expect-error legacy runtime access
    const userId = req.user?.id;
    // @ts-expect-error legacy runtime access
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    }

    // Verificar que el usuario sea cajero o administrador
    const roleLower = (userRole || '').toLowerCase();
    if (roleLower !== 'cajero' && roleLower !== 'administrador') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para rechazar solicitudes'
      });
    }

    if (!motivo_rechazo || motivo_rechazo.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'El motivo de rechazo es requerido'
      });
    }

    // Obtener la solicitud
    const solicitudes = await query(
      'SELECT * FROM solicitudes_servicios WHERE id_solicitud = ?',
      [id]
    ) as any[];

    if (solicitudes.length === 0) {
      return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
    }

    const solicitud = solicitudes[0];

    if (solicitud.estado !== 'pendiente') {
      return res.status(400).json({
        success: false,
        message: 'Esta solicitud ya ha sido procesada'
      });
    }

    // Actualizar la solicitud como rechazada
    await query(
      `UPDATE solicitudes_servicios 
       SET estado = 'rechazada', procesado_por = ?, motivo_rechazo = ?, fecha_procesamiento = NOW() 
       WHERE id_solicitud = ?`,
      [userId, motivo_rechazo, id]
    );

    // Log de notificación al usuario que creó la solicitud
    console.log(`Solicitud #${id} rechazada. Usuario solicitante: ${solicitud.solicitado_por}. Motivo: ${motivo_rechazo}`);

    // Enviar notificación SSE de actualización
    console.log('[RECHAZAR SOLICITUD] Enviando notificación SSE...');
    sendNotificationToAll('service_request_rejected', {
      id_solicitud: id,
      motivo_rechazo: motivo_rechazo,
      timestamp: new Date().toISOString()
    });

    console.log('[RECHAZAR SOLICITUD] Notificación SSE enviada');

    return res.status(200).json({
      success: true,
      message: 'Solicitud rechazada exitosamente'
    });
  } catch (error) {
    console.error('Error al rechazar solicitud:', error);
    return res.status(500).json({ success: false, message: 'Error al rechazar solicitud' });
  }
};

export default withAuth(handler);


