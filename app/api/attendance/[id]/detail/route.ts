import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { listarAsistenciasDeUsuario } from '@/modules/asistencia';

export const GET = withPublicRoute(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    if (!id) return NextResponse.json({ success: false, message: 'Falta el id' }, { status: 400 });

    const data = await listarAsistenciasDeUsuario(id, 'detalle');
    return NextResponse.json({ success: true, data });
  }
);
