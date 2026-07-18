import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { StatsService } from '@/lib/services/StatsService';
import { DashboardCache, DASHBOARD_CACHE_KEYS, DASHBOARD_TTL } from '@/lib/cache/dashboardCache';

export const GET = withRoute({ auth: true, audit: true }, async () => {
  const { data, fromCache } = await DashboardCache.getOrFetch(
    DASHBOARD_CACHE_KEYS.COMPOSITE,
    () => StatsService.getDashboardComposite(),
    DASHBOARD_TTL.COMPOSITE
  );

  const response = NextResponse.json({ success: true, data });
  response.headers.set('Cache-Control', 'private, max-age=15, stale-while-revalidate=30');
  response.headers.set('X-Cache', fromCache ? 'HIT' : 'MISS');

  return response;
});
