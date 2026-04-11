import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { query } from '@/lib/database/db';

export const GET = withAppAuth(async () => {
  const result = await query<any[]>(`
    SELECT DATE(fecha_crea) as date, SUM(total) as total, COUNT(*) as count
    FROM ventas
    WHERE fecha_crea >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
    GROUP BY DATE(fecha_crea)
    ORDER BY date
  `);

  return NextResponse.json({
    success: true,
    data: result.map((row: any) => ({
      date: row.date,
      total: Number(row.total || 0),
      count: Number(row.count || 0)
    }))
  });
});
