import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { StatsService } from '@/lib/services/StatsService';

export const GET = withPublicRoute(async () => {
  const stats = await StatsService.getCajaGeneralStats();

  const hasOpenCaja = !!stats.caja_id;
  const data = {
    hasOpenCaja,
    cajaInfo: hasOpenCaja
      ? {
          id_caja: stats.caja_id,
          usuario_id_apertura: stats.usuario_id_apertura || null,
          fecha_apertura: stats.fecha_apertura_raw || null,
          efectivo_en_caja: stats.efectivo_en_caja || 0
        }
      : null
  };

  return NextResponse.json({ success: true, data });
});
