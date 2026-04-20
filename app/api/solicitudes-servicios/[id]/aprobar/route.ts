import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { ServiceRequestRepository } from '@/lib/repositories/ServiceRequestRepository';
import { sendNotificationToAll } from '@/lib/api/sseService';

export const PATCH = withAppAuth(
  async (request: Request, { params, user }: { params: Promise<{ id: string }>; user: any }) => {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const result = await ServiceRequestRepository.approve(
      id,
      String(user.id),
      body?.habitacion_id ? String(body.habitacion_id) : undefined
    );

    sendNotificationToAll('service_request_processed', {
      id_solicitud: id,
      estado: 'aprobada',
      servicio_id: result.servicio_id
    });
    sendNotificationToAll('timers_updated', { timestamp: new Date().toISOString() });

    return NextResponse.json({ success: true, data: result });
  },
  { requiredPermission: { module: 'orders', action: 'process' } }
);
