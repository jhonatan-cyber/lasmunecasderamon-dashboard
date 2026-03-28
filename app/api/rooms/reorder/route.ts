import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { RoomRepository } from '@/lib/repositories/RoomRepository';

export const PUT = withAppApiWrapper(async (request: Request) => {
  const body = await request.json();
  await RoomRepository.reorder(body.room_orders);
  return NextResponse.json({ success: true, message: 'Rooms reordered' });
});
