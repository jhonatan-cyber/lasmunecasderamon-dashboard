import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { ValidationError } from '@/lib/errors/errors';
import { ServiceRequestService } from '@/modules/operacion';
import { sendNotificationToAll } from '@/lib/api/sseService';

export const PATCH = withRoute(
  { auth: true, audit: true, module: 'orders', action: 'process' },
  async (request: Request, { params, user }: { params: Promise<{ id: string }>; user: any }) => {
    const { id } = await params;
    const body = await request.json();
    const motivo = String(body?.motivo_rechazo || '').trim();

    if (!motivo) {
      throw new ValidationError('El motivo de rechazo es requerido');
    }

    const result = await ServiceRequestService.reject(id, String(user.id), motivo);

    sendNotificationToAll('service_request_processed', {
      id_solicitud: id,
      estado: 'rechazada'
    });

    return NextResponse.json({ success: true, data: result });
  }
);
