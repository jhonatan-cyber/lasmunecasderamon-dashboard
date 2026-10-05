import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { StatsService } from '@/modules/reportes';
import { DashboardCache, DASHBOARD_CACHE_KEYS, DASHBOARD_TTL } from '@/lib/cache/dashboardCache';

export const GET = withPublicRoute(async () => {
  const { data, fromCache } = await DashboardCache.getOrFetch(
    DASHBOARD_CACHE_KEYS.SALES_CHART,
    () => StatsService.getSalesByMonth(),
    DASHBOARD_TTL.SALES_CHART
  );

  return NextResponse.json(
    { success: true, data },
    {
      headers: { 'Cache-Control': 'private, no-store', 'X-Cache': fromCache ? 'HIT' : 'MISS' }
    }
  );
});
