import { NextResponse } from 'next/server';
import { withAppApiWrapper, withAppAuth } from '@/lib/api/app-api-wrapper';
import { RoomService } from '@/lib/services/RoomService';

export const GET = withAppApiWrapper(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const status = searchParams.get('status') || undefined;

  if (id) {
    const data = (await RoomService.getAll()).find(r => r.id === id);
    if (!data)
      return NextResponse.json(
        { success: false, message: 'Habitación no encontrada' },
        { status: 404 }
      );
    return NextResponse.json({ success: true, data });
  }

  const data = await RoomService.getAll(status);
  return NextResponse.json({ success: true, data });
});

export const POST = withAppAuth(async (request: Request) => {
  const body = await request.json();
  const data = await RoomService.createRoom(body);
  return NextResponse.json({ success: true, message: 'Habitación creada', data }, { status: 201 });
});

export const PUT = withAppAuth(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const body = await request.json();

  const targetId = id || body.id;
  if (!targetId)
    return NextResponse.json({ success: false, message: 'ID es requerido' }, { status: 400 });

  const data = await RoomService.update(targetId, body);
  return NextResponse.json({
    success: true,
    message: 'Habitación actualizada correctamente',
    data
  });
});

export const PATCH = withAppAuth(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const action = searchParams.get('action');

  if (!id || !action)
    return NextResponse.json(
      { success: false, message: 'ID y acción son requeridos' },
      { status: 400 }
    );

  const data = await RoomService.updateStatus(id, action);
  return NextResponse.json({ success: true, message: 'Estado actualizado correctamente', data });
});

export const DELETE = withAppAuth(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id)
    return NextResponse.json({ success: false, message: 'ID es requerido' }, { status: 400 });

  const result = await RoomService.delete(id);
  return NextResponse.json(result);
});
