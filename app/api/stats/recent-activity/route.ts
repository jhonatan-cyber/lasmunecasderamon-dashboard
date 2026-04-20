import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { StatsRepository } from '@/lib/repositories/StatsRepository';

export const GET = withAppAuth(async () => {
  const data = await StatsRepository.getRecentActivity();
  return NextResponse.json({ success: true, data });
});
