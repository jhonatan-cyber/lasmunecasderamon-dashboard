import { NextResponse } from 'next/server';
import { withAppApiWrapper, withAppAuth } from '@/lib/api/app-api-wrapper';
import { ServiceService } from '@/lib/services/ServiceService';
import { sendNotificationToAll } from '@/lib/api/sseService';

export const GET = withAppApiWrapper(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    const data = await ServiceService.getById(id);
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
    await ServiceService.updateService(id, body);
    sendNotificationToAll('service_changed', {
      action: 'update',
      id,
      timestamp: new Date().toISOString()
    });
    return NextResponse.json({ success: true, message: 'Servicio actualizado exitosamente' });
  }
);

export const PATCH = withAppAuth(
  async (request: Request, { params, user }: { params: Promise<{ id: string }>; user: any }) => {
    const id = (await params).id;
    const body = await request.json();
    const hasEstado = typeof body?.estado === 'number';
    const onlyEstadoPayload =
      hasEstado &&
      Object.keys(body || {}).every(key =>
        ['estado', 'device_date', 'paused_at', 'fecha_mod'].includes(key)
      );

    if (onlyEstadoPayload) {
      await ServiceService.updateStatus(id, body.estado, user.id.toString());
      sendNotificationToAll('service_changed', {
        action: 'status',
        id,
        estado: body.estado,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json({ success: true, message: 'Estado actualizado' });
    }

    await ServiceService.updateService(id, body);
    sendNotificationToAll('service_changed', {
      action: 'update',
      id,
      timestamp: new Date().toISOString()
    });
    return NextResponse.json({ success: true, message: 'Servicio actualizado' });
  }
);

export const DELETE = withAppAuth(async () => {
  return NextResponse.json(
    {
      success: false,
      message: 'La eliminacion fisica de servicios esta deshabilitada. Use el flujo de anulacion.'
    },
    { status: 409 }
  );
});
