import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { StatsService } from '@/lib/services/StatsService';

export const GET = withAppApiWrapper(async () => {
  const data = await StatsService.getLoggedUsers();
  return NextResponse.json({ success: true, data });
});
