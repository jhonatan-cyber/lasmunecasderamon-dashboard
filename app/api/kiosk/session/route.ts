import crypto from 'crypto';
import { NextResponse } from 'next/server';
import {
  KIOSK_COOKIE,
  KIOSK_SESSION_MAX_AGE,
  createDeviceToken,
  getKioskDevice,
  isKioskConfigured,
  kioskCookieOptions,
  logKioskEvent,
  matchesDeviceSecret
} from '@/lib/kiosk/deviceAuth';

export const dynamic = 'force-dynamic';

/**
 * Provisión de la pantalla del kiosko.
 *
 *   GET     → si el servidor está configurado y si esta pantalla ya está vinculada.
 *   POST    → vincula la pantalla con `{ secret }` (el secreto del local) y deja la
 *             cookie firmada. Se hace una vez, en la máquina de la entrada.
 *   DELETE  → desvincula la pantalla (borra la cookie).
 *
 * El secreto nunca se devuelve ni se guarda en el cliente: solo se cambia por la cookie.
 */
export async function GET() {
  const deviceId = await getKioskDevice();
  return NextResponse.json({
    success: true,
    configurado: isKioskConfigured(),
    vinculado: deviceId !== null
  });
}

export async function POST(request: Request) {
  if (!isKioskConfigured()) {
    return NextResponse.json(
      {
        success: false,
        message: 'El kiosko no está configurado en el servidor (falta KIOSK_DEVICE_SECRET).',
        code: 'KIOSK_NOT_CONFIGURED'
      },
      { status: 503 }
    );
  }

  let secret: unknown = null;
  try {
    secret = (await request.json())?.secret;
  } catch {
    secret = null;
  }

  if (!matchesDeviceSecret(secret)) {
    logKioskEvent('intento de provisión con secreto inválido', {
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
    });
    return NextResponse.json(
      { success: false, message: 'Secreto de dispositivo inválido' },
      { status: 401 }
    );
  }

  const deviceId = crypto.randomUUID();
  const token = await createDeviceToken(deviceId);

  const response = NextResponse.json({ success: true, deviceId });
  response.cookies.set(KIOSK_COOKIE, token, kioskCookieOptions(KIOSK_SESSION_MAX_AGE));
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(KIOSK_COOKIE, '', kioskCookieOptions(0));
  return response;
}
