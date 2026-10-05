import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { RoomService } from '@/modules/operacion';

export const PUT = withRoute(
  { auth: true, audit: true, module: 'rooms', action: 'write' },
  async (request: Request) => {
    const body = await request.json();
    await RoomService.reorder(body.room_orders);
    return NextResponse.json({ success: true, message: 'Rooms reordered' });
  }
);
