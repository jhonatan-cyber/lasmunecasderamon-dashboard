import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { VentasStatsService } from '@/lib/services/VentasStatsService';
import { ValidationError } from '@/lib/errors/errors';

export const GET = withAppApiWrapper(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const caja_id = searchParams.get('caja_id');

  if (!caja_id) throw new ValidationError('caja_id es requerido');

  const data = await VentasStatsService.getVentasTragosChicas(caja_id);
  return NextResponse.json({ success: true, ...data });
});
