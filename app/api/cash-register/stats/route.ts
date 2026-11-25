import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { StatsService } from '@/modules/reportes';
import { DashboardCache, DASHBOARD_CACHE_KEYS, DASHBOARD_TTL } from '@/lib/cache/dashboardCache';
import { formatDateLabel } from '@/lib/utils/calendarUtils';
import { addServerTimingMetric } from '@/lib/api/server-timing';

export const GET = withRoute(
  { auth: true, module: 'finances', action: 'read' },
  async (request: Request) => {
    const {
      data: stats,
      fromCache,
      cacheMs
    } = await DashboardCache.getOrFetch(
      DASHBOARD_CACHE_KEYS.STATS,
      () => StatsService.getCajaGeneralStats(),
      DASHBOARD_TTL.STATS
    );

    const formattedStats = {
      ...stats,
      tiempo_abierta: stats.fecha_apertura_raw
        ? `${stats.tiempo_abierta_horas}h ${stats.tiempo_abierta_minutos}m`
        : '0h 0m',
      fecha_apertura: stats.fecha_apertura_raw ? formatDateLabel(stats.fecha_apertura_raw) : 'N/A'
    };

    const response = NextResponse.json(
      { success: true, data: formattedStats },
      {
        headers: { 'Cache-Control': 'private, no-store', 'X-Cache': fromCache ? 'HIT' : 'MISS' }
      }
    );
    addServerTimingMetric(response, request, 'cache', cacheMs);
    return response;
  }
);
