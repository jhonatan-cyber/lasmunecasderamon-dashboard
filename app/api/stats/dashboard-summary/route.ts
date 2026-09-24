import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { StatsService } from '@/lib/services/StatsService';
import { DashboardCache, DASHBOARD_CACHE_KEYS, DASHBOARD_TTL } from '@/lib/cache/dashboardCache';

export const GET = withRoute(
  { auth: true, audit: true, module: 'dashboard', action: 'read' },
  async (_request: Request, { user }: { params: any; user: any }) => {
    const userId = user.id.toString();
    const { data, fromCache } = await DashboardCache.getOrFetch(
      DASHBOARD_CACHE_KEYS.USER_SUMMARY(userId, user.role),
      () => StatsService.getUserDashboardSummary(userId, user.role),
      DASHBOARD_TTL.USER_SUMMARY
    );
    return NextResponse.json(
      { success: true, data },
      {
        headers: { 'Cache-Control': 'private, no-store', 'X-Cache': fromCache ? 'HIT' : 'MISS' }
      }
    );
  }
);
