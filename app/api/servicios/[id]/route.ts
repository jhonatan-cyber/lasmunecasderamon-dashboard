import { NextResponse } from 'next/server';
import { withAppApiWrapper, withAppAuth } from '@/lib/api/app-api-wrapper';
import { ServiceRepository } from '@/lib/repositories/ServiceRepository';

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

export const PUT = withAppAuth(
  async (request: Request, { params }: { params: Promise<{ id: string }>; user: any }) => {
    const id = (await params).id;
    const body = await request.json();
    await ServiceRepository.updateService(id, body);
    return NextResponse.json({ success: true, message: 'Servicio actualizado exitosamente' });
  }
);

export const PATCH = withAppAuth(
  async (request: Request, { params, user }: { params: Promise<{ id: string }>; user: any }) => {
    const id = (await params).id;
    const { estado } = await request.json();
    await ServiceRepository.updateStatus(id, estado, user.id.toString());
    return NextResponse.json({ success: true, message: 'Estado actualizado' });
  }
);

export const DELETE = withAppAuth(
  async () => {
    return NextResponse.json(
      {
        success: false,
        message: 'La eliminacion fisica de servicios esta deshabilitada. Use el flujo de anulacion.'
      },
      { status: 409 }
    );
  }
);
