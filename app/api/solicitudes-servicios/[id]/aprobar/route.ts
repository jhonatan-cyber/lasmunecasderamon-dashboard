import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { ServiceRequestService } from '@/lib/services/ServiceRequestService';
import { sendNotificationToAll } from '@/lib/api/sseService';

export const PATCH = withRoute({ auth: true, audit: true, module: 'orders', action: 'process' },
  async (request: Request, { params, user }: { params: Promise<{ id: string }>; user: any }) => {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const result = await ServiceRequestService.approve(
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
  }
);
