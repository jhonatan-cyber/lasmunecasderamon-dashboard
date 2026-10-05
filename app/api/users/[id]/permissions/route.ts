import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { listarPermisosDeUsuario } from '@/modules/identidad';

export const GET = withPublicRoute(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    return NextResponse.json({ success: true, data: await listarPermisosDeUsuario(id) });
  }
);
