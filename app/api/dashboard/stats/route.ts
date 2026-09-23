import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { query } from '@/lib/database/db';
import { DashboardCache, DASHBOARD_CACHE_KEYS, DASHBOARD_TTL } from '@/lib/cache/dashboardCache';

export const GET = withRoute(
  { auth: true, audit: true, module: 'dashboard', action: 'read' },
  async () => {
    const { data } = await DashboardCache.getOrFetch(
      DASHBOARD_CACHE_KEYS.STATS,
      async () => {
        const now = getNowInBusinessTimezone();
        const currentMonth = now.substring(0, 7);
        const [y, m] = currentMonth.split('-').map(Number);
        const nextMonthStart =
          m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;

        const statsResult = await query<any[]>(
          `SELECT COUNT(*) AS "totalVentas", COALESCE(SUM(total), 0) AS "totalIngresos"
         FROM ventas
         WHERE DATE(fecha_crea) >= ? AND DATE(fecha_crea) < ?`,
          [`${currentMonth}-01`, nextMonthStart]
        );
        const stats = statsResult[0] || { totalVentas: 0, totalIngresos: 0 };
        const weeklyIncome = await getWeeklyIncome(now);

        return {
          totalSales: Number(stats.totalVentas) || 0,
          totalIncome: Number(stats.totalIngresos) || 0,
          monthlyGoal: 5000000,
          currentProgress: Number(stats.totalIngresos) || 0,
          weeklyIncome,
          badges: [],
          totalEarnings: 0,
          svcCount: 0
        };
      },
      DASHBOARD_TTL.STATS
    );

    return NextResponse.json({ success: true, data });
  }
);

async function getWeeklyIncome(now: string) {
  const result = await query<any[]>(
    `SELECT DATE(fecha_crea) as dia, SUM(total) as ingresos
     FROM ventas WHERE DATE(fecha_crea) >= ?
     GROUP BY DATE(fecha_crea) ORDER BY dia`,
    [now.substring(0, 10)]
  );
  const incomeByDay: number[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(now.substring(0, 10));
    date.setDate(date.getDate() - (6 - i));
    const dateStr = date.toISOString().substring(0, 10);
    const found = result.find((r: any) => r.dia === dateStr);
    incomeByDay.push(found ? Number(found.ingresos) : 0);
  }
  return incomeByDay;
}
