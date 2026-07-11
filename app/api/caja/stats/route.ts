import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { StatsService } from '@/lib/services/StatsService';
import { formatDateLabel } from '@/lib/utils/calendarUtils';

export const GET = withAppApiWrapper(async () => {
  const stats = await StatsService.getCajaGeneralStats();

  const formattedStats = {
    ...stats,
    tiempo_abierta: stats.fecha_apertura_raw
      ? `${stats.tiempo_abierta_horas}h ${stats.tiempo_abierta_minutos}m`
      : '0h 0m',
    fecha_apertura: stats.fecha_apertura_raw ? formatDateLabel(stats.fecha_apertura_raw) : 'N/A'
  };

  return NextResponse.json({
    success: true,
    ...formattedStats
  });
});
