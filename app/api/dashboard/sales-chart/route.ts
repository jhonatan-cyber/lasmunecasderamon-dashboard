import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { query } from '@/lib/database/db';
import { DashboardCache, DASHBOARD_CACHE_KEYS, DASHBOARD_TTL } from '@/lib/cache/dashboardCache';

export const GET = withRoute({ auth: true, audit: true }, async () => {
  const { data } = await DashboardCache.getOrFetch(
    DASHBOARD_CACHE_KEYS.SALES_CHART,
    async () => {
      const result = await query<any[]>(`
        SELECT DATE(fecha_crea) as date, SUM(total) as total, COUNT(*) as count
        FROM ventas
        WHERE fecha_crea >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
        GROUP BY DATE(fecha_crea)
        ORDER BY date
      `);
      return result.map((row: any) => ({
        date: row.date,
        total: Number(row.total || 0),
        count: Number(row.count || 0)
      }));
    },
    DASHBOARD_TTL.SALES_CHART
  );

  return NextResponse.json({ success: true, data });
});
