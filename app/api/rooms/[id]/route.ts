import { NextResponse } from 'next/server';
import { RoomRepository } from '@/lib/repositories/RoomRepository';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    const data = (await RoomRepository.getAll()).find(r => r.id === id);
    if (!data) return NextResponse.json({ success: false, message: 'Room not found' }, { status: 404 });
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error getting room', error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    const body = await request.json();
    await RoomRepository.update(id, body);
    return NextResponse.json({ success: true, message: 'Room updated' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Error updating room' }, { status: 400 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    const { action } = await request.json();
    await RoomRepository.updateStatus(id, action);
    return NextResponse.json({ success: true, message: 'Status updated' });
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
    const result = await RoomRepository.delete(id);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error deleting room', error: error.message }, { status: 500 });
  }
}
