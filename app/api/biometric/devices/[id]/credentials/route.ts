import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { guardarCredenciales, probarConexion } from '@/modules/asistencia';

export const GET = withRoute(
  { auth: true, access: 'administrator' },
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const resultado = await probarConexion(id);
    return NextResponse.json(
      { success: resultado.ok, message: resultado.mensaje, data: resultado },
      { status: resultado.ok ? 200 : 502 }
    );
  }
);

export const POST = withRoute(
  { auth: true, access: 'administrator', audit: true },
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const body = await request.json();
    const ip = String(body?.ip || '').trim();
    const usuario = String(body?.usuario || '').trim();
    const clave = String(body?.clave || '');

    if (!usuario || !clave) {
      return NextResponse.json(
        {
          success: false,
          message: 'Usuario y clave son requeridos (la IP se detecta sola por MAC)',
          code: 'VALIDATION'
        },
        { status: 400 }
      );
    }
    const resultado = await guardarCredenciales(id, { ip, usuario, clave });
    const status = resultado.ok
      ? 200
      : resultado.codigo === 'CREDENCIALES'
        ? 401
        : resultado.codigo && ['CONECTIVIDAD', 'SIN_MAC', 'FUERA_DE_RED'].includes(resultado.codigo)
          ? 502
          : 400;
    return NextResponse.json(
      { success: resultado.ok, message: resultado.mensaje, data: resultado },
      { status }
    );
  }
);
