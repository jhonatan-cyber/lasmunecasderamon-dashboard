import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { NotificationService } from '@/lib/services/NotificationService';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { ValidationError } from '@/lib/errors/errors';

export const POST = withRoute(
  { auth: true, access: 'authenticated', audit: true },
  async (request: Request, { user }: { params: any; user: any }) => {
    const { servicioId, roomName, type } = await request.json();

    if (!servicioId || !roomName || !type)
      throw new ValidationError('servicioId, roomName y type son requeridos', {
        servicioId,
        roomName,
        type
      });

    const notificationId = await NotificationService.create({
      usuario_id: user.id.toString(),
      tipo: 'asistencia',
      titulo: `Solicitud de ${type}`,
      mensaje: `Habitación ${roomName}: ${type}`,
      estado: 1,
      data: JSON.stringify({ servicioId, roomName, type })
    });

    sendNotificationToAll('assistance_request', {
      id: notificationId,
      servicioId,
      roomName,
      type,
      usuario: user.id.toString()
    });

    return NextResponse.json({ success: true, message: 'Solicitud enviada' });
  }
);
