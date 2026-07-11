import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { StatsService } from '@/lib/services/StatsService';

export const GET = withAppAuth(async () => {
  const data = await StatsService.getDashboardComposite();

  const response = NextResponse.json({ success: true, data });
  response.headers.set('Cache-Control', 'private, max-age=15, stale-while-revalidate=30');

  return response;
});
