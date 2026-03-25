import { cookies, headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { AuthenticatedUser } from '@/lib/middleware/auth';

export async function getAuth() {
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
      process.env.JWT_SECRET || 'default_secret'
    ) as AuthenticatedUser;

    return decoded;
  } catch {
    return null;
  }
}
