import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { NotificationRepository } from '@/lib/repositories/NotificationRepository';
import { getAuth } from '@/lib/auth/auth-app';
import { sendNotificationToAll } from '@/lib/api/sseService';

export const POST = withAppApiWrapper(async (request: Request) => {
  const user = await getAuth();
  if (!user) {
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });
  }

  const body = await request.json();
  const id = String(body?.id || '').trim();

  if (!id) {
    return NextResponse.json({ success: false, message: 'El id es requerido' }, { status: 400 });
  }

  await NotificationRepository.markAsRead(id);

  sendNotificationToAll('staff_call_accepted', {
    id,
    atendido_por_id: user.id,
    atendido_por_nombre: `${user.name ?? ''} ${user.lastName ?? ''}`.trim() || user.username || 'Personal',
  });

  return NextResponse.json({ success: true, message: 'Solicitud aceptada' });
});
