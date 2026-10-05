import { jwtVerify, SignJWT } from 'jose';
import { getSystemTimezone } from '@/lib/business/timezoneService';
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
