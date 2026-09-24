import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { StatsService } from '@/lib/services/StatsService';
import { DashboardCache, DASHBOARD_CACHE_KEYS, DASHBOARD_TTL } from '@/lib/cache/dashboardCache';

export const GET = withPublicRoute(async () => {
  const { data: stats, fromCache } = await DashboardCache.getOrFetch(
    DASHBOARD_CACHE_KEYS.STATS,
    () => StatsService.getCajaGeneralStats(),
    DASHBOARD_TTL.STATS
  );

  const hasOpenCaja = !!stats.caja_id;
  const data = {
    hasOpenCaja,
    cajaInfo: hasOpenCaja
      ? {
          id_caja: stats.caja_id,
          usuario_id_apertura: stats.usuario_id_apertura || null,
          fecha_apertura: stats.fecha_apertura_raw || null,
          efectivo_en_caja: stats.efectivo_en_caja || 0
        }
      : null
  };

  return NextResponse.json(
    { success: true, data },
    {
      headers: { 'Cache-Control': 'private, no-store', 'X-Cache': fromCache ? 'HIT' : 'MISS' }
    }
  );
});
