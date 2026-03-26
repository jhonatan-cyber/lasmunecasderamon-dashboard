import { cookies, headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { AuthenticatedUser } from '@/lib/middleware/auth';
import { env } from '@/lib/utils/env';


export async function getAuth(): Promise<AuthenticatedUser | null> {
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
    const decoded = jwt.verify(
      token,
      env.JWT_SECRET
    ) as AuthenticatedUser;

    // Enriquecer con permisos desde la BD (el JWT no los incluye)
    const { getUserPermissionsFromDB } = await import('@/lib/middleware/auth');
    decoded.permissions = await getUserPermissionsFromDB(decoded.id as string);

    return decoded;
  } catch {
    return null;
  }
}
