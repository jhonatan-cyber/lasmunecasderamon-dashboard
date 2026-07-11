import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { StatsService } from '@/lib/services/StatsService';

export const GET = withAppApiWrapper(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const offset = parseInt(searchParams.get('offset') || '0');

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

  return NextResponse.json({
    success: true,
    data: { year, data, summary: { totalVentas, promedioMensual } }
  });
});
