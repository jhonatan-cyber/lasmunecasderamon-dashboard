import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { StatsService } from '@/modules/reportes';
import { DashboardCache, DASHBOARD_CACHE_KEYS, DASHBOARD_TTL } from '@/lib/cache/dashboardCache';
import { addServerTimingMetric } from '@/lib/api/server-timing';

export const GET = withRoute(
  { auth: true, audit: true, module: 'dashboard', action: 'read' },
  async (request: Request, { user }: { params: any; user: any }) => {
    const userId = user.id.toString();
    const { data, fromCache, cacheMs } = await DashboardCache.getOrFetch(
      DASHBOARD_CACHE_KEYS.USER_SUMMARY(userId, user.role),
      () => StatsService.getUserDashboardSummary(userId, user.role),
      DASHBOARD_TTL.USER_SUMMARY
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
