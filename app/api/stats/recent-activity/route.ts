import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { StatsService } from '@/lib/services/StatsService';
import { DashboardCache, DASHBOARD_CACHE_KEYS, DASHBOARD_TTL } from '@/lib/cache/dashboardCache';

export const GET = withRoute(
  { auth: true, audit: true, module: 'dashboard', action: 'read' },
  async () => {
    const { data } = await DashboardCache.getOrFetch(
      DASHBOARD_CACHE_KEYS.RECENT_ACTIVITY,
      () => StatsService.getRecentActivity(),
      DASHBOARD_TTL.RECENT_ACTIVITY
    );
    return NextResponse.json({ success: true, data });
  }
);
