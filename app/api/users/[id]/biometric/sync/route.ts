import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { UserService } from '@/lib/services/UserService';
import {
  quitarDelEquipo,
  restaurarEnEquipo,
  sincronizarPersona
} from '@/lib/biometric/enrollmentService';
import { NotFoundError, ValidationError } from '@/lib/errors/errors';

/**
 * Sincronización de la persona con el lector (enrolamiento gestionado).
 *
 * PUT  → sincronizar: baja del equipo lo que la persona acaba de capturar
 *        (cara/huella) y lo guarda como plantilla maestra en nuestra DB.
 * POST → restaurar: re-escribe en el equipo lo que hay en la DB (útil al
 *        reemplazar el terminal o tras un formateo).
 * DELETE → quitar a la persona del equipo (mantiene el maestro en la DB).
 *
 * El `deviceId` identifica el equipo contra el que sincronizar.
 */
export const PUT = withRoute(
  { auth: true, module: 'users', action: 'write', audit: true },
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const body = await request.json();
    const deviceId = String(body?.deviceId || '').trim();
    if (!deviceId) {
      return NextResponse.json(
        { success: false, message: 'deviceId es requerido', code: 'VALIDATION' },
        { status: 400 }
      );
    }

    const usuario = await UserService.getById(id);
    if (!usuario) throw new NotFoundError('Usuario', id);
    const codigo = String(usuario.biometrico_codigo || '').trim();
    if (!codigo) {
      throw new ValidationError(
        'La persona no tiene código biométrico. Cargalo en su ficha antes de enrolar.'
      );
    }

    const resultado = await sincronizarPersona(
      deviceId,
      { usuarioId: id, nombre: usuario.name, codigo },
      { capturarHuella: Boolean(body?.capturarHuella) }
    );
    return NextResponse.json(
      { success: resultado.ok, message: resultado.mensaje, data: resultado },
      { status: resultado.ok ? 200 : 422 }
    );
  }
);

export const POST = withRoute(
  { auth: true, module: 'users', action: 'write', audit: true },
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const body = await request.json();
    const deviceId = String(body?.deviceId || '').trim();
    if (!deviceId) {
      return NextResponse.json(
        { success: false, message: 'deviceId es requerido', code: 'VALIDATION' },
        { status: 400 }
      );
    }

    const usuario = await UserService.getById(id);
    if (!usuario) throw new NotFoundError('Usuario', id);
    const codigo = String(usuario.biometrico_codigo || '').trim();
    if (!codigo) {
      throw new ValidationError('La persona no tiene código biométrico cargado.');
    }

    const resultado = await restaurarEnEquipo(deviceId, {
      usuarioId: id,
      nombre: usuario.name,
      codigo
    });
    return NextResponse.json(
      { success: resultado.ok, message: resultado.mensaje, data: resultado },
      { status: resultado.ok ? 200 : 422 }
    );
  }
);

export const DELETE = withRoute(
  { auth: true, module: 'users', action: 'write', audit: true },
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const url = new URL(request.url);
    const deviceId = (url.searchParams.get('deviceId') || '').trim();
    if (!deviceId) {
      return NextResponse.json(
        { success: false, message: 'deviceId es requerido', code: 'VALIDATION' },
        { status: 400 }
      );
    }

    const usuario = await UserService.getById(id);
    if (!usuario) throw new NotFoundError('Usuario', id);
    const codigo = String(usuario.biometrico_codigo || '').trim();
    if (!codigo) return NextResponse.json({ success: true, message: 'Nada para quitar' });

    await quitarDelEquipo(deviceId, { usuarioId: id, nombre: usuario.name, codigo });
    return NextResponse.json({ success: true, message: 'Persona quitada del equipo' });
  }
);
