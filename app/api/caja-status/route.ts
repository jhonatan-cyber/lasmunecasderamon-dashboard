import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { StatsService } from '@/lib/services/StatsService';

export const GET = withAppApiWrapper(async () => {
  const stats = await StatsService.getCajaGeneralStats();
  return NextResponse.json({ success: true, data: stats });
});
