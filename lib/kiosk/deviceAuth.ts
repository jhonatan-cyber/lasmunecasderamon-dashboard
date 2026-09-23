import crypto from 'crypto';
import { cookies } from 'next/headers';
import { query, withTransaction } from '@/lib/database/db';
import logger from '@/lib/utils/logger';

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
      await trx(
        'UPDATE kiosk_devices SET revocado_en = CURRENT_TIMESTAMP WHERE token_hash = ? AND revocado_en IS NULL',
        [digest(previousToken)]
      );
    }
    await trx(
      'INSERT INTO kiosk_devices (id, nombre, token_hash, creado_por) VALUES (?, ?, ?, ?)',
      [id, nombre, digest(token), userId]
    );
  });
  return { id, token };
}

export async function verifyDeviceToken(token: string | undefined): Promise<string | null> {
  if (!validToken(token)) return null;
  const rows = await query<{ id: string }[]>(
    'SELECT id FROM kiosk_devices WHERE token_hash = ? AND revocado_en IS NULL AND expira_en > CURRENT_TIMESTAMP',
    [digest(token)]
  );
  return rows[0]?.id ?? null;
}

export async function getKioskDevice(): Promise<string | null> {
  return verifyDeviceToken((await cookies()).get(KIOSK_COOKIE)?.value);
}

/** Atomic renewal: expired and revoked credentials cannot extend themselves. */
export async function renewDevice(token: string | undefined): Promise<string | null> {
  if (!validToken(token)) return null;
  const rows = await query<{ id: string }[]>(
    `UPDATE kiosk_devices SET ultimo_uso = CURRENT_TIMESTAMP, expira_en = CURRENT_TIMESTAMP + interval '30 days'
     WHERE token_hash = ? AND revocado_en IS NULL AND expira_en > CURRENT_TIMESTAMP RETURNING id`,
    [digest(token)]
  );
  return rows[0]?.id ?? null;
}

export async function isDeviceActive(id: string): Promise<boolean> {
  const rows = await query<{ id: string }[]>(
    'SELECT id FROM kiosk_devices WHERE id = ? AND revocado_en IS NULL AND expira_en > CURRENT_TIMESTAMP',
    [id]
  );
  return rows.length > 0;
}

export async function revokeDevice(id: string) {
  await query(
    'UPDATE kiosk_devices SET revocado_en = CURRENT_TIMESTAMP WHERE id = ? AND revocado_en IS NULL',
    [id]
  );
}

export async function listDevices() {
  return query<
    {
      id: string;
      nombre: string;
      fecha_crea: string;
      ultimo_uso: string;
      expira_en: string;
      revocado_en: string | null;
      activo: boolean;
    }[]
  >(
    'SELECT id, nombre, fecha_crea, ultimo_uso, expira_en, revocado_en, (revocado_en IS NULL AND expira_en > CURRENT_TIMESTAMP) AS activo FROM kiosk_devices ORDER BY fecha_crea DESC'
  );
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
