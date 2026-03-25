import { NextResponse } from 'next/server';
import { ServiceRepository } from '@/lib/repositories/ServiceRepository';
import { getAuth } from '@/lib/auth-app';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    const data = await ServiceRepository.getById(id);
    if (!data) return NextResponse.json({ success: false, message: 'Servicio no encontrado' }, { status: 404 });
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error getting service', error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    const body = await request.json();
    await ServiceRepository.update(id, body);
    return NextResponse.json({ success: true, message: 'Servicio actualizado exitosamente' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Error updating service' }, { status: 400 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    const user = await getAuth();
    const { estado } = await request.json();
    await ServiceRepository.updateStatus(id, estado, user?.id.toString());
    return NextResponse.json({ success: true, message: 'Estado actualizado' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Error updating status' }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    await ServiceRepository.delete(id);
    return NextResponse.json({ success: true, message: 'Servicio eliminado exitosamente' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error deleting service', error: error.message }, { status: 500 });
  }
}
