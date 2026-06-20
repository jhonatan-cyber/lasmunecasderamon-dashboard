import { cookies, headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { cache } from 'react';
import { AuthenticatedUser } from '@/lib/middleware/auth';
import { env } from '@/lib/utils/env';


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
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthenticatedUser;

    
    const { getUserPermissionsFromDB } = await import('@/lib/middleware/auth');
    decoded.permissions = await getUserPermissionsFromDB(decoded.id as string);

    return decoded;
  } catch {
    return null;
  }
});
