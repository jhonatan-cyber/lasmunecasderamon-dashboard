import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { EventService } from '@/lib/services/EventService';

export const GET = withAppAuth(async (request: Request, { user }: { params: any; user: any }) => {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const data = await EventService.getUserEvents(
    user.id.toString(),
    startDate || undefined,
    endDate || undefined
  );
  return NextResponse.json({ success: true, data });
});
