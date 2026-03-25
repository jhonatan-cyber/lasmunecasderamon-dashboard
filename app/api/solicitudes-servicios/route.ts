import { NextResponse } from 'next/server';
import { ServiceRequestRepository } from '@/lib/repositories/ServiceRequestRepository';
import { getAuth } from '@/lib/auth-app';
import { sendNotificationToAll } from '@/lib/sseService';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado') || undefined;
    const data = await ServiceRequestRepository.getAll(estado);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuth();
    if (!user) return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const result = await ServiceRequestRepository.create(body, user.id.toString());

    sendNotificationToAll('new_service_request', { id: result.id, ...body, habitacion_nombre: result.habitacion_nombre, cliente_nombre: result.cliente_nombre });
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
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
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
