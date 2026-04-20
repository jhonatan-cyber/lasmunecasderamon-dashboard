import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { ValidationError } from '@/lib/errors/errors';
import { ServiceRequestRepository } from '@/lib/repositories/ServiceRequestRepository';
import { sendNotificationToAll } from '@/lib/api/sseService';

export const PATCH = withAppAuth(
  async (request: Request, { params, user }: { params: Promise<{ id: string }>; user: any }) => {
    const { id } = await params;
    const body = await request.json();
    const motivo = String(body?.motivo_rechazo || '').trim();

    if (!motivo) {
      throw new ValidationError('El motivo de rechazo es requerido');
    }

    const result = await ServiceRequestRepository.reject(id, String(user.id), motivo);

    sendNotificationToAll('service_request_processed', {
      id_solicitud: id,
      estado: 'rechazada'
    });

    return NextResponse.json({ success: true, data: result });
  },
  { requiredPermission: { module: 'orders', action: 'process' } }
);
