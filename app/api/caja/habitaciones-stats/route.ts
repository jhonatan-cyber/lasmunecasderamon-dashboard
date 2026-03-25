import { NextResponse } from 'next/server';
import { StatsRepository } from '@/lib/repositories/StatsRepository';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const caja_id = searchParams.get('caja_id');

    if (!caja_id) {
      return NextResponse.json({ error: 'caja_id es requerido' }, { status: 400 });
    }

    // Usando el Patrón Repositorio en vez de SQL crudo en el Handler
    const data = await StatsRepository.getHabitacionesStats(caja_id);

    return NextResponse.json({ 
      success: true, 
      data 
    }, { status: 200 });

  } catch (error) {
    console.error('[API] Error en GET /api/caja/habitaciones-stats:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error interno del servidor',
      details: (error as Error).message 
    }, { status: 500 });
  }
}
