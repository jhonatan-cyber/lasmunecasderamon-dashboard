import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { EventService } from '@/lib/services/EventService';

export const GET = withAppAuth(async (_request: Request, { user }: { params: any; user: any }) => {
  const data = await EventService.getStats(user.id.toString());
  return NextResponse.json({ success: true, data });
});
