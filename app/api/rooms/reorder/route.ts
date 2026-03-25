import { NextResponse } from 'next/server';
import { RoomRepository } from '@/lib/repositories/RoomRepository';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await RoomRepository.reorder(body.items);
    return NextResponse.json({ success: true, message: 'Rooms reordered' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error reordering rooms', error: error.message }, { status: 500 });
  }
}
