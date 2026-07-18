import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { StatsService } from '@/lib/services/StatsService';
import { DashboardCache, DASHBOARD_CACHE_KEYS, DASHBOARD_TTL } from '@/lib/cache/dashboardCache';

export const GET = withRoute({ auth: true, audit: true }, async (_request: Request, { user }: { params: any; user: any }) => {
  const userId = user.id.toString();
  const { data } = await DashboardCache.getOrFetch(
    DASHBOARD_CACHE_KEYS.USER_SUMMARY(userId),
    () => StatsService.getUserDashboardSummary(userId, user.role),
    DASHBOARD_TTL.USER_SUMMARY
  );
  return NextResponse.json({ success: true, data });
});
