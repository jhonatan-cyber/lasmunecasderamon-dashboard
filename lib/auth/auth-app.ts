import { cookies, headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { cache } from 'react';
import { AuthenticatedUser } from '@/lib/middleware/auth';
import { env } from '@/lib/utils/env';

/**
 * getAuth — obtiene el usuario autenticado del request actual.
 *
 * Envuelto con React cache() para que múltiples llamadas dentro del mismo
 * request server-side retornen el mismo resultado sin repetir la lógica
 * de extracción de token ni las queries de permisos.
 */
export const getAuth = cache(async (): Promise<AuthenticatedUser | null> => {
  let token = null;

  // 1. Header
  const authHeader = (await headers()).get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.replace('Bearer ', '');
  }

  // 2. Cookie
  if (!token) {
    const tokenCookie = (await cookies()).get('token');
    if (tokenCookie) token = tokenCookie.value;
  }

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthenticatedUser;

    // Enriquecer con permisos — usa caché en memoria con TTL de 5 min
    const { getUserPermissionsFromDB } = await import('@/lib/middleware/auth');
    decoded.permissions = await getUserPermissionsFromDB(decoded.id as string);

    return decoded;
  } catch {
    return null;
  }
});
