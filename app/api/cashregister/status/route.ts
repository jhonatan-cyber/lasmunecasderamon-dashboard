import { NextResponse } from 'next/server';
import { StatsRepository } from '@/lib/repositories/StatsRepository';

export async function GET() {
  try {
    const stats = await StatsRepository.getCajaGeneralStats();
    
    const hasOpenCaja = !!stats.caja_id;
    const data = {
      hasOpenCaja,
      cajaInfo: hasOpenCaja ? {
        id_caja: stats.caja_id,
        usuario_id_apertura: stats.usuario_id_apertura || null,
        fecha_apertura: stats.fecha_apertura_raw || null
      } : null
    };

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
