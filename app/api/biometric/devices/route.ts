import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { createBiometricDevice, listBiometricDevices } from '@/modules/asistencia';
import { BiometricDeviceCreateSchema } from '@/lib/business/schemas';
import { validateOrResponse } from '@/lib/api/validate';

export const dynamic = 'force-dynamic';
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
    const validated = validateOrResponse(BiometricDeviceCreateSchema, body);
    if (validated instanceof NextResponse) return validated;

    const device = await createBiometricDevice(
      {
        nombre: validated.nombre,
        marca: validated.marca,
        modelo: validated.modelo || undefined,
        serial: validated.serial ?? '',
        ip: validated.ip || undefined
      },
      user.id
    );

    return NextResponse.json({ success: true, data: device }, { status: 201 });
  }
);
