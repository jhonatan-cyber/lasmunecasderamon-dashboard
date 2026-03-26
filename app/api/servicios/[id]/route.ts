import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { ServiceRepository } from '@/lib/repositories/ServiceRepository';
import { getAuth } from '@/lib/auth/auth-app';

export const GET = withAppApiWrapper(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    const data = await ServiceRepository.getById(id);
    if (!data)
      return NextResponse.json(
        { success: false, message: 'Servicio no encontrado' },
        { status: 404 }
      );
    return NextResponse.json({ success: true, data });
  }
);

export const PUT = withAppApiWrapper(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    const body = await request.json();
    await ServiceRepository.updateService(id, body);
    return NextResponse.json({ success: true, message: 'Servicio actualizado exitosamente' });
  }
);

export const PATCH = withAppApiWrapper(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    const user = await getAuth();
    const { estado } = await request.json();
    await ServiceRepository.updateStatus(id, estado, user?.id.toString());
    return NextResponse.json({ success: true, message: 'Estado actualizado' });
  }
);

export const DELETE = withAppApiWrapper(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    await ServiceRepository.delete(id);
    return NextResponse.json({ success: true, message: 'Servicio eliminado exitosamente' });
  }
);
