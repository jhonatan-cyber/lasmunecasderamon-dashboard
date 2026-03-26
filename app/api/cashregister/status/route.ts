import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { StatsRepository } from '@/lib/repositories/StatsRepository';

export const GET = withAppApiWrapper(async () => {
  const stats = await StatsRepository.getCajaGeneralStats();

  const hasOpenCaja = !!stats.caja_id;
  const data = {
    hasOpenCaja,
    cajaInfo: hasOpenCaja
      ? {
          id_caja: stats.caja_id,
          usuario_id_apertura: stats.usuario_id_apertura || null,
          fecha_apertura: stats.fecha_apertura_raw || null
        }
      : null
  };

  return NextResponse.json({ success: true, data });
});
