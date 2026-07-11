import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { StatsService } from '@/lib/services/StatsService';

export const GET = withAppAuth(async () => {
  const data = await StatsService.getRecentActivity();
  return NextResponse.json({ success: true, data });
});
