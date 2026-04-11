import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { EventRepository } from '@/lib/repositories/EventRepository';

export const GET = withAppAuth(async (_request: Request, { user }: { params: any; user: any }) => {
  const data = await EventRepository.getStats(user.id.toString());
  return NextResponse.json({ success: true, data });
});
