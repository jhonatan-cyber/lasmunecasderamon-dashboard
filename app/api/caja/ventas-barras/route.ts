import { NextResponse } from 'next/server';
import { VentasStatsRepository } from '@/lib/repositories/VentasStatsRepository';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const caja_id = searchParams.get('caja_id');

    if (!caja_id) {
      return NextResponse.json({ error: 'caja_id es requerido' }, { status: 400 });
    }

    const data = await VentasStatsRepository.getVentasBarras(caja_id);
    return NextResponse.json({ success: true, ...data }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ 
      success: true, 
      total_venta: 0, 
      monto_productos: 0, 
      propinas: 0, 
      message: 'Error en consulta, devolviendo valores por defecto' 
    }, { status: 200 });
  }
}
