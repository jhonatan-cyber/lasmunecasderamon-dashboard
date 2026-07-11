import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { RoomService } from '@/lib/services/RoomService';

export const PUT = withAppApiWrapper(async (request: Request) => {
  const body = await request.json();
  await RoomService.reorder(body.room_orders);
  return NextResponse.json({ success: true, message: 'Rooms reordered' });
});
