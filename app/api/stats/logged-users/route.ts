import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { StatsService } from '@/modules/reportes';
import { DashboardCache, DASHBOARD_CACHE_KEYS, DASHBOARD_TTL } from '@/lib/cache/dashboardCache';
import { addServerTimingMetric } from '@/lib/api/server-timing';

export const GET = withRoute(
  { auth: true, module: 'users', action: 'read' },
  async (request: Request) => {
    const { data, fromCache, cacheMs } = await DashboardCache.getOrFetch(
      DASHBOARD_CACHE_KEYS.LOGGED_USERS,
      () => StatsService.getLoggedUsers(),
      DASHBOARD_TTL.LOGGED_USERS
    );
    const response = NextResponse.json(
      { success: true, data },
      {
        headers: { 'Cache-Control': 'private, no-store', 'X-Cache': fromCache ? 'HIT' : 'MISS' }
      }
    );
    addServerTimingMetric(response, request, 'cache', cacheMs);
    return response;
  }
);
