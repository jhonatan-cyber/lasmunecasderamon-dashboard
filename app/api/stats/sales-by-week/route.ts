import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { StatsService } from '@/lib/services/StatsService';

const DAYS_EN_TO_ES: Record<string, string> = {
  Sunday: 'Domingo',
  Monday: 'Lunes',
  Tuesday: 'Martes',
  Wednesday: 'Miércoles',
  Thursday: 'Jueves',
  Friday: 'Viernes',
  Saturday: 'Sábado'
};

export const GET = withAppApiWrapper(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const offset = parseInt(searchParams.get('offset') || '0');

  const rows: {
    semana: string;
    dia_semana: string;
    fecha_inicio: string;
    orden: number;
    total: number;
    cantidad: number;
  }[] = await StatsService.getSalesByWeek(offset);

  if (rows.length === 0) {
    return NextResponse.json({
      success: true,
      data: { startDate: '', endDate: '', data: [], summary: { totalVentas: 0, promedioDiario: 0 } }
    });
  }

  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const data = rows.map(r => ({
    dia_semana: r.dia_semana,
    dia_espanol: DAYS_EN_TO_ES[r.dia_semana] || r.dia_semana,
    orden: Number(r.orden),
    total: Number(r.total),
    cantidad: Number(r.cantidad)
  }));

  const fechas = rows
    .map(r => r.fecha_inicio)
    .filter(Boolean)
    .sort();
  const startDate = fechas[0];
  const endDate = fechas[fechas.length - 1];
  const totalVentas = data.reduce((s, r) => s + r.total, 0);
  const promedioDiario = data.length > 0 ? Math.round(totalVentas / data.length) : 0;

  return NextResponse.json({
    success: true,
    data: { startDate, endDate, data, summary: { totalVentas, promedioDiario } }
  });
});
