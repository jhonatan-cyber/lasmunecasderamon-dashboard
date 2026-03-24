import jwt from 'jsonwebtoken';
import { query, generateUUID } from '@/lib/db';
import { logger } from './logger';
import { getSystemTimezone, getNowInBusinessTimezone } from './timezoneService';

export interface AuthenticatedUser {
  id: number;
  userId: number;
  username: string;
  nick?: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

type TokenRequest = {
  headers?: {
    authorization?: string;
  };
  cookies?: {
    token?: string;
  };
};

export function verifyToken(token: string): AuthenticatedUser | null {
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'default_secret'
    ) as AuthenticatedUser;

    return decoded;
  } catch {
    return null;
  }
}

export function generateToken(userData: {
  id: number;
  username: string;
  nick?: string;
  email: string;
  role: string;
}): string {
  return jwt.sign(
    {
      id: userData.id,
      userId: userData.id,
      username: userData.username,
      nick: userData.nick,
      email: userData.email,
      role: userData.role,
    },
    process.env.JWT_SECRET || 'default_secret',
    { expiresIn: '24h' }
  );
}

export function extractToken(req: TokenRequest): string | null {
  const auth = req.headers?.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return auth.replace('Bearer ', '');
  }

  if (req.cookies?.token) {
    return req.cookies.token;
  }

  return null;
}

export async function registrarLogin(usuarioId: string | number, ip?: string): Promise<void> {
  try {
    const ipLimpia = ip?.split(',')[0].trim() || null;
    const tz = getSystemTimezone();
    const ahora = new Date();
    const horaLocal = parseInt(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: tz,
        hour: '2-digit',
        hour12: false,
      }).format(ahora)
    );

    const lastLogin = getNowInBusinessTimezone();
    const enLocal = horaLocal >= 23 ? 1 : 0;

    await query('DELETE FROM logins WHERE usuario_id = ?', [usuarioId]);
    await query(
      'INSERT INTO logins (id_login, usuario_id, last_login, estado, ip_address, en_local) VALUES (?, ?, ?, 1, ?, ?)',
      [generateUUID(), usuarioId, lastLogin, ipLimpia, enLocal]
    );
  } catch (error) {
    const exception = error instanceof Error ? error : new Error('Error desconocido al registrar login');
    logger.error('Error al registrar login', {
      error: exception.message,
      stack: exception.stack,
      usuarioId,
      ip,
    });
  }
}
