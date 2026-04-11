import { NextResponse } from 'next/server';
import { withAppApiWrapper, withAppAuth } from '@/lib/api/app-api-wrapper';
import { ServiceRequestRepository } from '@/lib/repositories/ServiceRequestRepository';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { ValidationError } from '@/lib/errors/errors';

export const GET = withAppApiWrapper(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const estado = searchParams.get('estado') || undefined;
  const data = await ServiceRequestRepository.getAll(estado);
  return NextResponse.json({ success: true, data });
});

export const POST = withAppAuth(async (request: Request, { user }: { params: any; user: any }) => {
  const body = await request.json();
  const result = await ServiceRequestRepository.create(body, user.id.toString());

  sendNotificationToAll('new_service_request', {
    id: result.id,
    ...body,
    habitacion_nombre: result.habitacion_nombre,
    cliente_nombre: result.cliente_nombre
  });
  return NextResponse.json({ success: true, data: result }, { status: 201 });
});

export const DELETE = withAppAuth(
  async (request: Request) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) throw new ValidationError('ID requerido');

    await ServiceRequestRepository.delete(id);
    sendNotificationToAll('service_request_deleted', { id });
    return NextResponse.json({ success: true, message: 'Solicitud eliminada' });
  },
  { requiredPermission: { module: 'orders', action: 'delete' } }
);
