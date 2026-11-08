import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { ApiResponse } from '@/lib/api/api-response';
import {
  eliminarConfigAdministrador,
  guardarConfigAdministrador,
  listarAdministradoresDisponibles,
  listarConfigAdministradores
} from '@/modules/comunicaciones';

/**
 * Configuración de WhatsApp por administrador. Sólo el rol administrador puede
 * ver ni editar estas credenciales: cada uno recibe los avisos en su propio
 * número y, si quiere, desde su propia cuenta de Twilio.
 */
export const GET = withRoute({ auth: true, access: 'administrator' }, async () => {
  const [administradores, disponibles] = await Promise.all([
    listarConfigAdministradores(),
    listarAdministradoresDisponibles()
  ]);
  return NextResponse.json(
    { success: true, data: { administradores, disponibles } },
    { headers: { 'Cache-Control': 'no-store' } }
  );
});

export const PUT = withRoute(
  { auth: true, access: 'administrator', audit: true },
  async (request: Request) => {
    const body = await request.json().catch(() => ({}));
    const usuarioId = typeof body?.usuarioId === 'string' ? body.usuarioId : '';
    if (!usuarioId) return ApiResponse.validationError('Falta el administrador');

    const error = await guardarConfigAdministrador(usuarioId, {
      destino: String(body?.destino ?? ''),
      accountSid: body?.accountSid != null ? String(body.accountSid) : undefined,
      authToken: body?.authToken != null ? String(body.authToken) : undefined,
      whatsappNumber: body?.whatsappNumber != null ? String(body.whatsappNumber) : undefined,
      activo: body?.activo !== false
    });
    if (error) return ApiResponse.validationError(error);

    return NextResponse.json({ success: true, data: await listarConfigAdministradores() });
  }
);

export const DELETE = withRoute(
  { auth: true, access: 'administrator', audit: true },
  async (request: Request) => {
    const body = await request.json().catch(() => ({}));
    const usuarioId = typeof body?.usuarioId === 'string' ? body.usuarioId : '';
    if (!usuarioId) return ApiResponse.validationError('Falta el administrador');

    await eliminarConfigAdministrador(usuarioId);
    return NextResponse.json({ success: true, data: await listarConfigAdministradores() });
  }
);
