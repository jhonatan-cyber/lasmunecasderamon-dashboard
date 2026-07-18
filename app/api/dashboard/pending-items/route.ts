import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { StatsService } from '@/lib/services/StatsService';
import { DashboardCache, DASHBOARD_CACHE_KEYS, DASHBOARD_TTL } from '@/lib/cache/dashboardCache';

export const GET = withRoute({ auth: true, audit: true }, async () => {
  const { data, fromCache } = await DashboardCache.getOrFetch(
    DASHBOARD_CACHE_KEYS.PENDING_ITEMS,
    () => StatsService.getDashboardPendingItems(),
    DASHBOARD_TTL.PENDING_ITEMS
  );

  const response = NextResponse.json({ success: true, data });
  response.headers.set('Cache-Control', 'private, max-age=10, stale-while-revalidate=20');
  response.headers.set('X-Cache', fromCache ? 'HIT' : 'MISS');

  return response;
});
