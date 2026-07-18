import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { StatsService } from '@/lib/services/StatsService';

export const GET = withPublicRoute(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const caja_id = searchParams.get('caja_id');

  if (!caja_id) {
    return NextResponse.json({ error: 'caja_id es requerido' }, { status: 400 });
  }

  const data = await StatsService.getHabitacionesStats(caja_id);

  return NextResponse.json(
    {
      success: true,
      data
    },
    { status: 200 }
  );
});
