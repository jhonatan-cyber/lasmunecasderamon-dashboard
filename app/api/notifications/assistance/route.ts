import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { NotificationRepository } from '@/lib/repositories/NotificationRepository';
import { getAuth } from '@/lib/auth/auth-app';

export const POST = withAppApiWrapper(async (request: Request) => {
  const user = await getAuth();
  if (!user)
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

  const body = await request.json();
  const { servicioId, roomName, type } = body;

  if (!servicioId || !roomName || !type) {
    return NextResponse.json(
      { success: false, message: 'servicioId, roomName y type son requeridos' },
      { status: 400 }
    );
  }

  // Create a notification for assistance request
  await NotificationRepository.create({
    usuario_id: user.id.toString(),
    tipo: 'asistencia',
    titulo: `Solicitud de ${type}`,
    mensaje: `Habitación ${roomName}: ${type}`,
    estado: 1,
    data: JSON.stringify({ servicioId, roomName, type })
  });

  // Send to all connected clients via SSE
  const { sendNotificationToAll } = await import('@/lib/api/sseService');
  sendNotificationToAll('assistance_request', {
    servicioId,
    roomName,
    type,
    usuario: user.id.toString()
  });

  return NextResponse.json({ success: true, message: 'Solicitud enviada' });
});
