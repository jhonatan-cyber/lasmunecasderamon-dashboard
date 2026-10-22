import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { listarAsistenciasDeHoy } from '@/modules/asistencia';

export const GET = withPublicRoute(async () => {
  const data = await listarAsistenciasDeHoy();
  return NextResponse.json({ success: true, data });
});
