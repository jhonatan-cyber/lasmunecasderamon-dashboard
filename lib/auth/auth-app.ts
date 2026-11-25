import { cookies, headers } from 'next/headers';
import { jwtVerify } from 'jose';
import { cache } from 'react';
import { AuthenticatedUser } from '@/lib/middleware/auth';
import { validarSesionPayload } from './auth';
import { env } from '@/lib/utils/env';

const getSecretKey = () => new TextEncoder().encode(env.JWT_SECRET);

export interface AuthTimings {
  token: number;
  jwt: number;
  session: number;
  permissions: number;
}

export const getAuthWithTimings = cache(async () => {
  const timings: AuthTimings = { token: 0, jwt: 0, session: 0, permissions: 0 };
  let token = null;

  const requestHeaders = await headers();
  const collectTimings =
    process.env.NODE_ENV !== 'production' && requestHeaders.get('x-lmr-profile') === '1';
  const tokenStartedAt = collectTimings ? performance.now() : 0;
  const authHeader = requestHeaders.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.replace('Bearer ', '');
  }

  if (!token) {
    const tokenCookie = (await cookies()).get('token');
    if (tokenCookie) token = tokenCookie.value;
  }
  if (collectTimings) timings.token = performance.now() - tokenStartedAt;

  if (!token) return { user: null, timings };

  let activeStage: keyof AuthTimings = 'jwt';
  let stageStartedAt = collectTimings ? performance.now() : 0;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (collectTimings) timings.jwt = performance.now() - stageStartedAt;

    activeStage = 'session';
    stageStartedAt = collectTimings ? performance.now() : 0;
    const sessionIsValid = await validarSesionPayload(payload);
    if (collectTimings) timings.session = performance.now() - stageStartedAt;
    if (!sessionIsValid) return { user: null, timings };

    activeStage = 'permissions';
    stageStartedAt = collectTimings ? performance.now() : 0;
    const { getUserPermissionsFromDB } = await import('@/lib/middleware/auth');
    (payload as any).permissions = await getUserPermissionsFromDB((payload as any).id as string);
    if (collectTimings) timings.permissions = performance.now() - stageStartedAt;

    return { user: payload as unknown as AuthenticatedUser, timings };
  } catch {
    if (collectTimings) timings[activeStage] = performance.now() - stageStartedAt;
    return { user: null, timings };
  }
});

export const getAuth = cache(async (): Promise<AuthenticatedUser | null> => {
  return (await getAuthWithTimings()).user;
});
