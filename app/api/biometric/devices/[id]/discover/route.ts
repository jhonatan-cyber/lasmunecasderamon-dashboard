import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { descubrirIpDispositivo } from '@/modules/asistencia';

export const POST = withRoute(
  { auth: true, access: 'administrator', audit: true },
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const forzar = body?.forzar !== false;
    const resultado = await descubrirIpDispositivo(id, { forzar });
    const status = resultado.ok
      ? 200
      : resultado.codigo === 'NO_ENCONTRADO'
        ? 404
        : resultado.codigo === 'SIN_CREDENCIALES'
          ? 400
          : 502;
    return NextResponse.json(
      { success: resultado.ok, message: resultado.mensaje, data: resultado },
      { status }
    );
  }
);
