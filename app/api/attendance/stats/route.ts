import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { consultarEstadisticasAsistencia } from '@/modules/asistencia';

export const GET = withPublicRoute(async () => {
  const data = await consultarEstadisticasAsistencia();
  return NextResponse.json({ success: true, data: [data] });
});
