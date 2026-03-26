import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { getAuth } from '@/lib/auth/auth-app';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { query } from '@/lib/database/db';

export const GET = withAppApiWrapper(async () => {
  const user = await getAuth();
  if (!user)
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

  const now = getNowInBusinessTimezone();
  const currentMonth = now.substring(0, 7); // YYYY-MM

  // Get sales stats for current month directly
  const statsResult = await query<any[]>(
    `
    SELECT 
      COUNT(*) as totalVentas,
      COALESCE(SUM(total), 0) as totalIngresos
    FROM ventas
    WHERE DATE(fecha_crea) >= ? AND DATE(fecha_crea) < ?
  `,
    [`${currentMonth}-01`, `${currentMonth}-31`]
  );

  const stats = statsResult[0] || { totalVentas: 0, totalIngresos: 0 };

  // Calculate weekly income for the current week
  const weeklyIncome = await getWeeklyIncome();

  return NextResponse.json({
    success: true,
    data: {
      totalSales: Number(stats.totalVentas) || 0,
      totalIncome: Number(stats.totalIngresos) || 0,
      monthlyGoal: 5000000, // Meta configurable
      currentProgress: Number(stats.totalIngresos) || 0,
      weeklyIncome,
      badges: [],
      totalEarnings: 0,
      svcCount: 0
    }
  });
});

async function getWeeklyIncome() {
  const now = getNowInBusinessTimezone();

  // Get start of week (Monday)
  const weekStart = now.substring(0, 10);

  const result = await query<any[]>(
    `
    SELECT 
      DATE(fecha_crea) as dia,
      SUM(total) as ingresos
    FROM ventas
    WHERE DATE(fecha_crea) >= ?
    GROUP BY DATE(fecha_crea)
    ORDER BY dia
  `,
    [weekStart]
  );

  // Fill missing days with 0
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
