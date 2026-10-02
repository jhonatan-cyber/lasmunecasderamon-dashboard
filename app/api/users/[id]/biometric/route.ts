import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { UserService } from '@/lib/services/UserService';
import { desenrolarUsuario } from '@/lib/biometric/unenrollmentService';

export const DELETE = withRoute(
  { auth: true, audit: true, module: 'users', action: 'write' },
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const resultado = await desenrolarUsuario((await params).id);
    return NextResponse.json(
      { success: resultado.ok, message: resultado.mensaje, data: resultado },
      { status: resultado.ok ? 200 : 422 }
    );
  }
);

/**
 * Enrolamiento del lector de la puerta para una persona.
 *
 * La cara y la huella se cargan en el menú del equipo; acá se guarda el codigo
 * que el equipo va a reportar y que modalidades quedaron listas. El GET tambien
 * devuelve la ultima verificacion recibida, para confirmar que el codigo funciona.
 */
export const GET = withRoute(
  { auth: true, module: 'users', action: 'read' },
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    return NextResponse.json({ success: true, data: await UserService.getBiometricStatus(id) });
  }
);

export const PUT = withRoute(
  { auth: true, audit: true, module: 'users', action: 'write' },
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    const body = await request.json();
    const data = await UserService.updateBiometric(id, body);
    return NextResponse.json({ success: true, message: 'Enrolamiento guardado', data });
  }
);

/**
 * Genera el código numérico de la persona (User ID que el lector reporta) solo
 * si todavía no tiene uno: primera vez que se enrola, no hace falta escribirlo.
 */
export const POST = withRoute(
  { auth: true, audit: true, module: 'users', action: 'write' },
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    const data = await UserService.asignarCodigoBiometrico(id);
    return NextResponse.json({
      success: true,
      message: data.generado ? `Código ${data.codigo} generado` : 'La persona ya tenía código',
      data
    });
  }
);
