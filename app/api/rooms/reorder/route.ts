import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { RoomRepository } from '@/lib/repositories/RoomRepository';

export const POST = withAppApiWrapper(async (request: Request) => {
  const body = await request.json();
  await RoomRepository.reorder(body.items);
  return NextResponse.json({ success: true, message: 'Rooms reordered' });
});
