import jwt from 'jsonwebtoken';
import { query, generateUUID } from '@/lib/database/db';
import { logger } from '@/lib/utils/logger';
import { getSystemTimezone, getNowInBusinessTimezone } from '@/lib/business/timezoneService';

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
  id: string | number;
  username: string;
  name: string;
  lastName: string;
  nick?: string;
  email: string;
  role: string;
}): string {
  return jwt.sign(
    {
      id: userData.id,
      userId: userData.id,
      username: userData.username,
      name: userData.name,
      lastName: userData.lastName,
      nick: userData.nick,
      email: userData.email,
      role: userData.role
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

const ROLES_PARA_REGISTRAR = ['cajero', 'garzon', 'anfitriona'];

export async function registrarLogin(usuarioId: string | number): Promise<void> {
  try {
    const userRole = await query<any[]>(
      `
      SELECT r.nombre as rol_nombre 
      FROM usuarios u 
      INNER JOIN roles r ON u.rol_id = r.id_rol 
      WHERE u.id_usuario = ?
    `,
      [usuarioId]
    );

    const rol = userRole[0]?.rol_nombre?.toLowerCase() || '';
    if (!ROLES_PARA_REGISTRAR.includes(rol)) {
      return;
    }

    const lastLogin = getNowInBusinessTimezone();

    await query(
      'INSERT INTO logins (id_login, usuario_id, last_login, estado) VALUES (?, ?, ?, 1)',
      [generateUUID(), usuarioId, lastLogin]
    );
  } catch (error) {
    const exception =
      error instanceof Error ? error : new Error('Error desconocido al registrar login');
    logger.error('Error al registrar login', {
      error: exception.message,
      stack: exception.stack,
      usuarioId
    });
  }
}
