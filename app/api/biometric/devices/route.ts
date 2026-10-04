import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { createBiometricDevice, listBiometricDevices } from '@/modules/asistencia';
import type { BiometricMarca } from '@/modules/asistencia';

export const dynamic = 'force-dynamic';

/**
 * Administración de los equipos biométricos de la puerta. El alta es la única
 * "autorización" que tiene el flujo: el serial dado de alta es lo que el handler
 * de `/iclock/cdata` y `/dahua/push` comprueba antes de aceptar un evento.
 */
export const GET = withRoute({ auth: true, access: 'administrator' }, async () => {
  return NextResponse.json(
    { success: true, data: await listBiometricDevices() },
    { headers: { 'Cache-Control': 'no-store' } }
  );
});

export const POST = withRoute(
  { auth: true, access: 'administrator', audit: true },
  async (request, { user }) => {
    const body = await request.json();
    const marca: BiometricMarca = body?.marca === 'dahua' ? 'dahua' : 'zkteco';
    if (!body?.nombre || !body?.serial) {
      return NextResponse.json(
        { success: false, message: 'Nombre y serial son requeridos', code: 'VALIDATION' },
        { status: 400 }
      );
    }

    const device = await createBiometricDevice(
      {
        nombre: String(body.nombre),
        marca,
        modelo: body.modelo ? String(body.modelo) : undefined,
        serial: String(body.serial),
        ip: body.ip ? String(body.ip) : undefined
      },
      user.id
    );

    return NextResponse.json({ success: true, data: device }, { status: 201 });
  }
);
