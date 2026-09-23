import crypto from 'crypto';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { env } from '@/lib/utils/env';
import logger from '@/lib/utils/logger';

/**
 * Credencial de la pantalla del kiosko.
 *
 * La pantalla de la entrada está en un lugar público y no tiene sesión de nadie, pero
 * necesita emitir desafíos de asistencia (y leer el padrón y el código del local). Eso
 * no puede quedar en un endpoint público: si cualquiera puede pedir el desafío de
 * cualquiera, la asistencia se marca desde la casa y no prueba nada.
 *
 * Por eso la pantalla se provisiona una vez con `KIOSK_DEVICE_SECRET` (un secreto del
 * local, no una cuenta de personal) y recibe una cookie `kiosk_token` firmada con ese
 * mismo secreto y acotada al alcance `kiosk`. Todo lo que puede hacer está en
 * `/api/kiosk/*`: emitir desafíos y leer el tablero. No sirve como sesión de usuario:
 * va en otra cookie y `getAuth()` no la mira.
 */

export const KIOSK_COOKIE = 'kiosk_token';
const KIOSK_SCOPE = 'kiosk';
const KIOSK_SESSION_TTL_DAYS = 30;
const MIN_SECRET_LENGTH = 16;

export function isKioskConfigured(): boolean {
  return (env.KIOSK_DEVICE_SECRET?.length ?? 0) >= MIN_SECRET_LENGTH;
}

function deviceKey(): Uint8Array {
  return new TextEncoder().encode(env.KIOSK_DEVICE_SECRET ?? '');
}

/** Comparación en tiempo constante: no se filtra por dónde falla el secreto. */
export function matchesDeviceSecret(candidate: unknown): boolean {
  if (!isKioskConfigured() || typeof candidate !== 'string') return false;
  const expected = Buffer.from(env.KIOSK_DEVICE_SECRET as string);
  const given = Buffer.from(candidate);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

export async function createDeviceToken(deviceId: string): Promise<string> {
  return await new SignJWT({ scope: KIOSK_SCOPE, device: deviceId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${KIOSK_SESSION_TTL_DAYS}d`)
    .sign(deviceKey());
}

export async function verifyDeviceToken(token: string | undefined): Promise<string | null> {
  if (!token || !isKioskConfigured()) return null;
  try {
    const { payload } = await jwtVerify(token, deviceKey());
    if (payload.scope !== KIOSK_SCOPE || typeof payload.device !== 'string') return null;
    return payload.device;
  } catch {
    return null;
  }
}

/** Devuelve el id del dispositivo si la petición trae una credencial válida. */
export async function getKioskDevice(): Promise<string | null> {
  const store = await cookies();
  return await verifyDeviceToken(store.get(KIOSK_COOKIE)?.value);
}

export function kioskCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: maxAgeSeconds
  };
}

export const KIOSK_SESSION_MAX_AGE = KIOSK_SESSION_TTL_DAYS * 24 * 60 * 60;

export function logKioskEvent(message: string, context: Record<string, unknown> = {}) {
  logger.warn(`[kiosk] ${message}`, context);
}
