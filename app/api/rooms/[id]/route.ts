import { NextResponse } from 'next/server';
import { withAppApiWrapper, withAppAuth } from '@/lib/api/app-api-wrapper';
import { RoomService } from '@/lib/services/RoomService';

export const GET = withAppApiWrapper(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    const data = (await RoomService.getAll()).find(r => r.id === id);
    if (!data)
      return NextResponse.json({ success: false, message: 'Room not found' }, { status: 404 });
    return NextResponse.json({ success: true, data });
  }
);

export const PUT = withAppAuth(
  async (request: Request, { params }: { params: Promise<{ id: string }>; user: any }) => {
    const id = (await params).id;
    const body = await request.json();
    await RoomService.update(id, body);
    return NextResponse.json({ success: true, message: 'Room updated' });
  }
);

export const PATCH = withAppAuth(
  async (request: Request, { params }: { params: Promise<{ id: string }>; user: any }) => {
    const id = (await params).id;
    const { action } = await request.json();
    await RoomService.updateStatus(id, action);
    return NextResponse.json({ success: true, message: 'Status updated' });
  }
);

export const DELETE = withAppAuth(
  async (request: Request, { params }: { params: Promise<{ id: string }>; user: any }) => {
    const id = (await params).id;
    const result = await RoomService.delete(id);
    return NextResponse.json(result);
  }
);
