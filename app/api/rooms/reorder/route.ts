import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { RoomService } from '@/lib/services/RoomService';

export const PUT = withPublicRoute(async (request: Request) => {
  const body = await request.json();
  await RoomService.reorder(body.room_orders);
  return NextResponse.json({ success: true, message: 'Rooms reordered' });
});
