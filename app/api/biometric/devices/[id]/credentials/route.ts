import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { guardarCredenciales, probarConexion } from '@/lib/biometric/enrollmentService';

/**
 * Credenciales CGI del equipo (usuario/clave del lector + su IP).
 *
 * Se guardan cifradas y se validan EN EL MOMENTO: la prueba de conexión confirma
 * que el equipo de esa IP reporta el serial vinculado, para no enrolar contra
 * un terminal equivocado. GET = prueba de conexión con las credenciales ya
 * guardadas; POST = guardar nuevas (probando primero).
 */
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
    // La IP es opcional: si se deja vacía (o si no responde), el servicio la
    // re-busca por MAC y recién ahí valida usuario/clave contra el serial.
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
