import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { withRoute, withPublicRoute } from '@/lib/api/withRoute';
import { getAuth } from '@/lib/auth/auth-app';
import { isAdministrator } from '@/lib/middleware/auth';
import {
  KIOSK_COOKIE,
  KIOSK_SESSION_MAX_AGE,
  getKioskDevice,
  kioskCookieOptions,
  provisionDevice,
  renewDevice,
  revokeDevice
} from '@/modules/asistencia';

export const dynamic = 'force-dynamic';
const activation = z.object({
  nombre: z.string().trim().min(1).max(100).default('Pantalla de asistencia')
});

export const GET = withPublicRoute(async () => {
  const [deviceId, user] = await Promise.all([getKioskDevice(), getAuth()]);
  return NextResponse.json(
    { success: true, vinculado: deviceId !== null, puedeActivar: isAdministrator(user) },
    { headers: { 'Cache-Control': 'no-store' } }
  );
});

export const POST = withRoute(
  { auth: true, access: 'administrator', audit: true },
  async (request, { user }) => {
    const { nombre } = activation.parse(await request.json());
    const store = await cookies();
    const device = await provisionDevice(nombre, String(user.id), store.get(KIOSK_COOKIE)?.value);
    const response = NextResponse.json({ success: true, deviceId: device.id });
    response.cookies.set(KIOSK_COOKIE, device.token, kioskCookieOptions(KIOSK_SESSION_MAX_AGE));
    // Leave only the device credential on the shared screen, never the admin session.
    response.cookies.set('token', '', kioskCookieOptions(0));
    response.cookies.set('refresh_token', '', kioskCookieOptions(0));
    return response;
  }
);

export const PATCH = withPublicRoute(async () => {
  const token = (await cookies()).get(KIOSK_COOKIE)?.value;
  const id = await renewDevice(token);
  if (!id || !token) {
    const response = NextResponse.json(
      {
        success: false,
        code: 'KIOSK_NOT_LINKED',
        message: 'Activa esta pantalla con una sesión de administrador.'
      },
      { status: 401 }
    );
    response.cookies.set(KIOSK_COOKIE, '', kioskCookieOptions(0));
    return response;
  }
  const response = NextResponse.json({ success: true });
  response.cookies.set(KIOSK_COOKIE, token, kioskCookieOptions(KIOSK_SESSION_MAX_AGE));
  return response;
});

export const DELETE = withRoute({ auth: true, access: 'administrator', audit: true }, async () => {
  const device = await getKioskDevice();
  if (device) await revokeDevice(device);
  const response = NextResponse.json({ success: true });
  response.cookies.set(KIOSK_COOKIE, '', kioskCookieOptions(0));
  return response;
});
