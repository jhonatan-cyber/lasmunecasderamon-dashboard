import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { AuthService } from '@/modules/identidad';

export const GET = withRoute({ auth: true, access: 'administrator' }, async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const data = await AuthService.getLogs({
    estado: searchParams.get('estado') ?? undefined,
    usuario_id: searchParams.get('usuario_id') ?? undefined,
    fecha_inicio: searchParams.get('fecha_inicio') ?? undefined,
    fecha_fin: searchParams.get('fecha_fin') ?? undefined
  });
  return NextResponse.json({ success: true, data });
});
