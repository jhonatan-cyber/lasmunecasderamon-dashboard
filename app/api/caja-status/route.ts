import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { StatsService } from '@/lib/services/StatsService';

export const GET = withPublicRoute(async () => {
  const stats = await StatsService.getCajaGeneralStats();
  return NextResponse.json({ success: true, data: stats });
});
