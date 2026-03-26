import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { ServiceRequestRepository } from '@/lib/repositories/ServiceRequestRepository';
import { getAuth } from '@/lib/auth/auth-app';
import { sendNotificationToAll } from '@/lib/api/sseService';

export const GET = withAppApiWrapper(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const estado = searchParams.get('estado') || undefined;
  const data = await ServiceRequestRepository.getAll(estado);
  return NextResponse.json({ success: true, data });
});

export const POST = withAppApiWrapper(async (request: Request) => {
  const user = await getAuth();
  if (!user)
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

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

export const DELETE = withAppApiWrapper(async (request: Request) => {
  const user = await getAuth();
  if (!user || !['administrador', 'cajero'].includes(user.role.toLowerCase())) {
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, message: 'ID requerido' }, { status: 400 });

  await ServiceRequestRepository.delete(id);
  sendNotificationToAll('service_request_deleted', { id });
  return NextResponse.json({ success: true, message: 'Solicitud eliminada' });
});
