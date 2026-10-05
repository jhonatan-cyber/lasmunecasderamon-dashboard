import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { StatsService } from '@/modules/reportes';
import { DashboardCache, DASHBOARD_CACHE_KEYS, DASHBOARD_TTL } from '@/lib/cache/dashboardCache';

export const GET = withPublicRoute(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const offset = parseInt(searchParams.get('offset') || '0');

  const { data: resultData, fromCache } = await DashboardCache.getOrFetch(
    DASHBOARD_CACHE_KEYS.SALES_BY_MONTH(offset),
    async () => {
      const rows: { mes: string; cantidad_ventas: number; total_ventas: number }[] =
        await StatsService.getSalesByMonth(offset);
      const now = new Date();
      now.setMonth(now.getMonth() - offset * 12);
      const fallbackYear = now.getFullYear();
      const year = rows.length > 0 ? parseInt(rows[0].mes.slice(0, 4)) : fallbackYear;
      const data = rows.map(r => ({
        mes: r.mes,
        mes_num: parseInt(r.mes.slice(5, 7)),
        total: Number(r.total_ventas),
        cantidad_ventas: Number(r.cantidad_ventas)
      }));
      const totalVentas = data.reduce((s, r) => s + r.total, 0);
      const promedioMensual = data.length > 0 ? Math.round(totalVentas / data.length) : 0;
      return { year, data, summary: { totalVentas, promedioMensual } };
    },
    DASHBOARD_TTL.SALES_BY_MONTH
  );

  return NextResponse.json(
    { success: true, data: resultData },
    {
      headers: { 'Cache-Control': 'private, no-store', 'X-Cache': fromCache ? 'HIT' : 'MISS' }
    }
  );
});
