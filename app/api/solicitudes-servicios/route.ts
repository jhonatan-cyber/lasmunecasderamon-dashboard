import { NextResponse } from 'next/server';
import { withPublicRoute, withRoute } from '@/lib/api/withRoute';
import { ServiceRequestService } from '@/modules/operacion';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { ValidationError } from '@/lib/errors/errors';

export const GET = withPublicRoute(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const estado = searchParams.get('estado') || undefined;
  const data = await ServiceRequestService.getAll(estado);
  return NextResponse.json({ success: true, data });
});

export const POST = withRoute(
  { auth: true, audit: true, module: 'orders', action: 'write' },
  async (request: Request, { user }: { params: any; user: any }) => {
    const body = await request.json();
    const result = await ServiceRequestService.create(body, user.id.toString());

    sendNotificationToAll('new_service_request', {
      id: result.id,
      ...body,
      habitacion_nombre: result.habitacion_nombre,
      cliente_nombre: result.cliente_nombre
    });
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  }
);

export const DELETE = withRoute(
  { auth: true, audit: true, module: 'orders', action: 'delete' },
  async (request: Request) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) throw new ValidationError('ID requerido');

    await ServiceRequestService.delete(id);
    sendNotificationToAll('service_request_deleted', { id });
    return NextResponse.json({ success: true, message: 'Solicitud eliminada' });
  }
);
