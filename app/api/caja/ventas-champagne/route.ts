import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { VentasStatsService } from '@/modules/reportes';
import { DashboardCache, DASHBOARD_CACHE_KEYS, DASHBOARD_TTL } from '@/lib/cache/dashboardCache';

export const GET = withPublicRoute(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const caja_id = searchParams.get('caja_id');

  if (!caja_id) {
    return NextResponse.json({ error: 'caja_id es requerido' }, { status: 400 });
  }

  const { data, fromCache } = await DashboardCache.getOrFetch(
    DASHBOARD_CACHE_KEYS.SALES_CHART_BY_CAJA(caja_id, 'champagne'),
    () => VentasStatsService.getVentasChampagne(caja_id),
    DASHBOARD_TTL.SALES_CHART_BY_CAJA
  );

  return NextResponse.json(
    { success: true, ...data },
    {
      status: 200,
      headers: { 'Cache-Control': 'private, no-store', 'X-Cache': fromCache ? 'HIT' : 'MISS' }
    }
  );
});
