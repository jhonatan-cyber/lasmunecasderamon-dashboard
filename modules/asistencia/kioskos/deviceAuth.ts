import crypto from 'crypto';
import { cookies } from 'next/headers';
import { withTransaction } from '@/lib/database/db';
import logger from '@/lib/utils/logger';
import {
  actualizarDispositivoKiosko,
  buscarDispositivoKiosko,
  crearDispositivoKiosko,
  dispositivoKioskoActivo,
  listarDispositivosKiosko,
  renovarDispositivoKiosko,
  revocarDispositivoKiosko
} from './repositorio';

export const KIOSK_COOKIE = 'kiosk_token';
export const KIOSK_SESSION_MAX_AGE = 30 * 24 * 60 * 60;
const digest = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
const validToken = (token: string | undefined): token is string =>
  !!token && /^kiosk_[a-f0-9]{64}$/.test(token);

/** Only a hash is persisted. This credential cannot be used as a person session. */
export async function provisionDevice(nombre: string, userId: string, previousToken?: string) {
  const id = crypto.randomUUID();
  const token = `kiosk_${crypto.randomBytes(32).toString('hex')}`;
  await withTransaction(async trx => {
    if (validToken(previousToken)) {
      await actualizarDispositivoKiosko(trx, digest(previousToken));
    }
    await crearDispositivoKiosko(trx, { id, nombre, tokenHash: digest(token), userId });
  });
  return { id, token };
}

export async function verifyDeviceToken(token: string | undefined): Promise<string | null> {
  if (!validToken(token)) return null;
  const rows = await buscarDispositivoKiosko(digest(token));
  return rows[0]?.id ?? null;
}

export async function getKioskDevice(): Promise<string | null> {
  return verifyDeviceToken((await cookies()).get(KIOSK_COOKIE)?.value);
}

/** Atomic renewal: expired and revoked credentials cannot extend themselves. */
export async function renewDevice(token: string | undefined): Promise<string | null> {
  if (!validToken(token)) return null;
  const rows = await renovarDispositivoKiosko(digest(token));
  return rows[0]?.id ?? null;
}

export async function isDeviceActive(id: string): Promise<boolean> {
  return dispositivoKioskoActivo(id);
}

export async function revokeDevice(id: string) {
  await revocarDispositivoKiosko(id);
}

export async function listDevices() {
  return listarDispositivosKiosko();
}

export function kioskCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge
  };
}

export function logKioskEvent(message: string, context: Record<string, unknown> = {}) {
  logger.warn(`[kiosk] ${message}`, context);
}
