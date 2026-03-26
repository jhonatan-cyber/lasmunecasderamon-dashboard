import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { getAuth } from '@/lib/auth/auth-app';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';

export const GET = withAppApiWrapper(async () => {
  const user = await getAuth();
  if (!user)
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

  const now = getNowInBusinessTimezone();

  // Get last 30 days of sales data
  const result = await getSalesChartData();

  return NextResponse.json({
    success: true,
    data: result
  });
});

async function getSalesChartData() {
  const { query } = await import('@/lib/database/db');
  const now = getNowInBusinessTimezone();

  // Get last 30 days
  const result = await query<any[]>(`
    SELECT 
      DATE(fecha_crea) as date,
      SUM(total) as total,
      COUNT(*) as count
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
}
