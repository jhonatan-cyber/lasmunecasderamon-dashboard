import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { StatsService } from '@/modules/reportes';
import { DashboardCache, DASHBOARD_CACHE_KEYS, DASHBOARD_TTL } from '@/lib/cache/dashboardCache';
import { addServerTimingMetric } from '@/lib/api/server-timing';

export const GET = withRoute(
  { auth: true, audit: true, module: 'dashboard', action: 'read' },
  async (request: Request) => {
    const {
      data: cached,
      fromCache,
      cacheMs
    } = await DashboardCache.getOrFetch(
      DASHBOARD_CACHE_KEYS.COMPOSITE,
      async () => ({
        composite: await StatsService.getDashboardComposite(),
        generatedAt: new Date().toISOString()
      }),
      DASHBOARD_TTL.COMPOSITE
    );

    const response = NextResponse.json({
      success: true,
      data: { ...cached.composite, generatedAt: cached.generatedAt, fromCache }
    });
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('X-Cache', fromCache ? 'HIT' : 'MISS');
    addServerTimingMetric(response, request, 'cache', cacheMs);

    return response;
  }
);
