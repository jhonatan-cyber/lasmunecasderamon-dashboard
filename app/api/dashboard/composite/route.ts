import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { StatsRepository } from '@/lib/repositories/StatsRepository';

export const GET = withAppAuth(async () => {
  const data = await StatsRepository.getDashboardComposite();

  const response = NextResponse.json({ success: true, data });
  response.headers.set('Cache-Control', 'private, max-age=15, stale-while-revalidate=30');

  return response;
});
