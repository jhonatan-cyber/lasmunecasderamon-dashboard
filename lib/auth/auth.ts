import { jwtVerify, SignJWT } from 'jose';
import { query, generateUUID } from '@/lib/database/db';
import { logger } from '@/lib/utils/logger';
import { getSystemTimezone, getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { env } from '@/lib/utils/env';

export interface AuthenticatedUser {
  id: string | number;
  userId: string | number;
  username: string;
  name: string;
  lastName: string;
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

const getSecretKey = () => new TextEncoder().encode(env.JWT_SECRET);
const getRefreshSecretKey = () => new TextEncoder().encode(env.JWT_REFRESH_SECRET);

const TOKEN_PAYLOAD_FIELDS = {
  id: null as string | number | null,
  userId: null as string | number | null,
  username: null as string | null,
  name: null as string | null,
  lastName: null as string | null,
  nick: null as string | null,
  email: null as string | null,
  role: null as string | null
};

type TokenPayload = { [K in keyof typeof TOKEN_PAYLOAD_FIELDS]: string | number | null };

function buildPayload(userData: {
  id: string | number;
  username: string;
  name: string;
  lastName: string;
  nick?: string;
  email: string;
  role: string;
}): TokenPayload {
  return {
    id: userData.id,
    userId: userData.id,
    username: userData.username,
    name: userData.name,
    lastName: userData.lastName,
    nick: userData.nick || null,
    email: userData.email,
    role: userData.role
  };
}

export async function verifyToken(token: string): Promise<AuthenticatedUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as AuthenticatedUser;
  } catch {
    return null;
  }
}

/** Verify a refresh token with the refresh secret */
export async function verifyRefreshToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getRefreshSecretKey());
    return payload as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Access token: 15 minutos de expiración.
 * Usa JWT_SECRET (misma clave que antes, pero expiración más corta).
 */
export async function generateAccessToken(userData: {
  id: string | number;
  username: string;
  name: string;
  lastName: string;
  nick?: string;
  email: string;
  role: string;
}): Promise<string> {
  return await new SignJWT(buildPayload(userData))
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('15m')
    .sign(getSecretKey());
}

/**
 * Refresh token: 7 días de expiración.
 * Usa JWT_REFRESH_SECRET (clave separada de access token).
 */
export async function generateRefreshToken(userData: {
  id: string | number;
  username: string;
  name: string;
  lastName: string;
  nick?: string;
  email: string;
  role: string;
}): Promise<string> {
  return await new SignJWT(buildPayload(userData))
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(getRefreshSecretKey());
}

/**
 * generateToken legacy — mantiene compatibilidad.
 * Ahora genera un access token de 15 minutos.
 */
export const generateToken = generateAccessToken;

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

const ROLES_PARA_REGISTRAR = ['cajero', 'garzon', 'anfitriona'];

export async function registrarLogin(
  usuarioId: string | number,
  rolNombre?: string
): Promise<void> {
  try {
    let rol: string;
    if (rolNombre) {
      rol = rolNombre.toLowerCase();
    } else {
      const userRole = await query<any[]>(
        `SELECT r.nombre as rol_nombre 
         FROM usuarios u 
         INNER JOIN roles r ON u.rol_id = r.id_rol 
         WHERE u.id_usuario = ?`,
        [usuarioId]
      );
      rol = userRole[0]?.rol_nombre?.toLowerCase() || '';
    }
    if (!ROLES_PARA_REGISTRAR.includes(rol)) {
      return;
    }

    const now = getNowInBusinessTimezone();
    const today = now.substring(0, 10);

    const existingLogin = await query<any[]>(
      `SELECT id_login, last_login FROM logins WHERE usuario_id = ? AND estado = 1`,
      [usuarioId]
    );

    if (existingLogin.length > 0) {
      const lastLoginDate = existingLogin[0].last_login.toString().substring(0, 10);

      if (lastLoginDate === today) {
        return;
      }

      await query(`UPDATE logins SET estado = 0 WHERE usuario_id = ? AND estado = 1`, [usuarioId]);
    }

    await query(
      'INSERT INTO logins (id_login, usuario_id, last_login, estado) VALUES (?, ?, ?, 1)',
      [generateUUID(), usuarioId, now]
    );
  } catch (error) {
    const exception =
      error instanceof Error ? error.message : 'Error desconocido al registrar login';
    logger.error('Error al registrar login', {
      error: exception,
      usuarioId
    });
  }
}
