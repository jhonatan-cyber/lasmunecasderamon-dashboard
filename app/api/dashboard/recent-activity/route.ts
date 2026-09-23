import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { StatsService } from '@/lib/services/StatsService';
import { DashboardCache, DASHBOARD_CACHE_KEYS, DASHBOARD_TTL } from '@/lib/cache/dashboardCache';

export const GET = withRoute(
  { auth: true, audit: true, module: 'dashboard', action: 'read' },
  async () => {
    const { data, fromCache } = await DashboardCache.getOrFetch(
      DASHBOARD_CACHE_KEYS.RECENT_ACTIVITY,
      () => StatsService.getRecentActivity(8),
      DASHBOARD_TTL.RECENT_ACTIVITY
    );

    const response = NextResponse.json({ success: true, data });
    response.headers.set('Cache-Control', 'private, max-age=15, stale-while-revalidate=30');
    response.headers.set('X-Cache', fromCache ? 'HIT' : 'MISS');

    return response;
  }
);
