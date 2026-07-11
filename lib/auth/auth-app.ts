import { cookies, headers } from 'next/headers';
import { jwtVerify } from 'jose';
import { cache } from 'react';
import { AuthenticatedUser } from '@/lib/middleware/auth';
import { env } from '@/lib/utils/env';

const getSecretKey = () => new TextEncoder().encode(env.JWT_SECRET);

export const getAuth = cache(async (): Promise<AuthenticatedUser | null> => {
  let token = null;

  const authHeader = (await headers()).get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.replace('Bearer ', '');
  }

  if (!token) {
    const tokenCookie = (await cookies()).get('token');
    if (tokenCookie) token = tokenCookie.value;
  }

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey());

    const { getUserPermissionsFromDB } = await import('@/lib/middleware/auth');
    (payload as any).permissions = await getUserPermissionsFromDB((payload as any).id as string);

    return payload as unknown as AuthenticatedUser;
  } catch {
    return null;
  }
});
