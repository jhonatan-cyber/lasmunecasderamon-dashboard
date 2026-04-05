import jwt from 'jsonwebtoken';
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

export function verifyToken(token: string): AuthenticatedUser | null {
  try {
    const decoded = jwt.verify(
      token,
      env.JWT_SECRET
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
    env.JWT_SECRET,
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

    const now = getNowInBusinessTimezone();
    const today = now.substring(0, 10); // YYYY-MM-DD

    // Buscar si hay un login activo para este usuario
    const existingLogin = await query<any[]>(
      `SELECT id_login, last_login FROM logins WHERE usuario_id = ? AND estado = 1`,
      [usuarioId]
    );

    if (existingLogin.length > 0) {
      const lastLoginDate = existingLogin[0].last_login.toString().substring(0, 10);

      // Si ya hay uno con fecha de hoy, no hacer nada
      if (lastLoginDate === today) {
        return;
      }

      // Si existe pero no es de hoy, cambiar estado a 0
      await query(
        `UPDATE logins SET estado = 0 WHERE usuario_id = ? AND estado = 1`,
        [usuarioId]
      );
    }

    // Insertar nuevo login
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
