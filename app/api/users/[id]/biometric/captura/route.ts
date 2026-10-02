import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { UserService } from '@/lib/services/UserService';
import { fotoEnVivoDelEquipo, guardarFotoCapturada } from '@/lib/biometric/enrollmentService';
import { NotFoundError, ValidationError } from '@/lib/errors/errors';

/** Captura la imagen del lector y la guarda solamente en la DB del sistema. */
export const POST = withRoute(
  { auth: true, module: 'users', action: 'write', audit: true },
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const deviceId = String(body?.deviceId || '').trim();
    if (!deviceId) {
      return NextResponse.json(
        { success: false, message: 'deviceId es requerido', code: 'VALIDATION' },
        { status: 400 }
      );
    }

    const usuario = await UserService.getById(id);
    if (!usuario) throw new NotFoundError('Usuario', id);

    // La foto llega del propio equipo (nunca del navegador): así lo que se
    // guarda es exactamente lo que vio el lector.
    const foto = await fotoEnVivoDelEquipo(deviceId);
    if (!foto.base64) throw new ValidationError('El equipo no devolvió ninguna imagen');

    const resultado = await guardarFotoCapturada(
      deviceId,
      { usuarioId: id, nombre: usuario.name, codigo: String(usuario.biometrico_codigo || '') },
      foto.base64
    );
    return NextResponse.json({ success: true, message: resultado.mensaje, data: resultado });
  }
);
