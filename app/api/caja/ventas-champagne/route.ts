import { NextResponse } from 'next/server';
import { VentasStatsRepository } from '@/lib/repositories/VentasStatsRepository';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const caja_id = searchParams.get('caja_id');

    if (!caja_id) {
      return NextResponse.json({ error: 'caja_id es requerido' }, { status: 400 });
    }

    const data = await VentasStatsRepository.getVentasChampagne(caja_id);
    return NextResponse.json({ success: true, ...data }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Error interno del servidor',
      details: (error as Error).message 
    }, { status: 500 });
  }
}
