import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { NotificationService } from '@/modules/comunicaciones';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { ValidationError } from '@/lib/errors/errors';

export const POST = withRoute(
  { auth: true, access: 'authenticated', audit: true },
  async (request: Request, { user }: { params: any; user: any }) => {
    const body = await request.json();
    const id = String(body?.id || '').trim();

    if (!id) throw new ValidationError('El id es requerido');

    await NotificationService.markAsRead(id);

    sendNotificationToAll('staff_call_accepted', {
      id,
      atendido_por_id: user.id,
      atendido_por_nombre:
        `${user.name ?? ''} ${user.lastName ?? ''}`.trim() || user.username || 'Personal'
    });

    return NextResponse.json({ success: true, message: 'Solicitud aceptada' });
  }
);
