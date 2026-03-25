import { NextResponse } from 'next/server';
import { StatsRepository } from '@/lib/repositories/StatsRepository';
import { formatDateLabel } from '@/lib/calendarUtils';

export async function GET() {
  try {
    const stats = await StatsRepository.getCajaGeneralStats();

    // Formatear para compatibilidad con el frontend antiguo
    const formattedStats = {
      ...stats,
      tiempo_abierta: stats.fecha_apertura_raw
        ? `${stats.tiempo_abierta_horas}h ${stats.tiempo_abierta_minutos}m`
        : '0h 0m',
      fecha_apertura: stats.fecha_apertura_raw
        ? formatDateLabel(stats.fecha_apertura_raw)
        : 'N/A'
    };

    return NextResponse.json({
      success: true,
      ...formattedStats
    });
  } catch (error: any) {
    console.error('[API /api/caja/stats] Error:', error);
    return NextResponse.json({
      success: false,
      message: 'Error al obtener estadísticas de caja',
      error: error.message
    }, { status: 500 });
  }
}
