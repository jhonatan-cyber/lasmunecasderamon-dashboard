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
    if (!ip || !usuario || !clave) {
      return NextResponse.json(
        { success: false, message: 'IP, usuario y clave son requeridos', code: 'VALIDATION' },
        { status: 400 }
      );
    }
    const resultado = await guardarCredenciales(id, { ip, usuario, clave });
    return NextResponse.json(
      { success: resultado.ok, message: resultado.mensaje, data: resultado },
      { status: resultado.ok ? 200 : 400 }
    );
  }
);
