import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { VentasStatsService } from '@/lib/services/VentasStatsService';

export const GET = withAppApiWrapper(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const caja_id = searchParams.get('caja_id');

  if (!caja_id) {
    return NextResponse.json({ error: 'caja_id es requerido' }, { status: 400 });
  }

  const data = await VentasStatsService.getVentasChampagne(caja_id);
  return NextResponse.json({ success: true, ...data }, { status: 200 });
});
