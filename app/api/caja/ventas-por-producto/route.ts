import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { VentasStatsService } from '@/lib/services/VentasStatsService';
import { ValidationError } from '@/lib/errors/errors';
import { DashboardCache, DASHBOARD_CACHE_KEYS, DASHBOARD_TTL } from '@/lib/cache/dashboardCache';

export const GET = withPublicRoute(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const caja_id = searchParams.get('caja_id');

  if (!caja_id) throw new ValidationError('caja_id es requerido');

  const { data, fromCache } = await DashboardCache.getOrFetch(
    DASHBOARD_CACHE_KEYS.SALES_CHART_BY_CAJA(caja_id, 'productos'),
    () => VentasStatsService.getVentasPorProducto(caja_id),
    DASHBOARD_TTL.SALES_CHART_BY_CAJA
  );

  return NextResponse.json(
    { success: true, data },
    {
      headers: { 'Cache-Control': 'private, no-store', 'X-Cache': fromCache ? 'HIT' : 'MISS' }
    }
  );
});
