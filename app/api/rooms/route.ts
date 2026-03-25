import { NextResponse } from 'next/server';
import { RoomRepository } from '@/lib/repositories/RoomRepository';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const data = await RoomRepository.getAll(status);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error getting rooms', error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const id = await RoomRepository.create(body);
    return NextResponse.json({ success: true, message: 'Room created', id }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Error creating room' }, { status: 400 });
  }
}
