import { jwtVerify, SignJWT } from 'jose';
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
  sessionVersion: number;
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
  role: null as string | null,
  sessionVersion: null as number | null
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
  sessionVersion?: number;
}): TokenPayload {
  return {
    id: userData.id,
    userId: userData.id,
    username: userData.username,
    name: userData.name,
    lastName: userData.lastName,
    nick: userData.nick || null,
    email: userData.email,
    role: userData.role,
    sessionVersion: userData.sessionVersion ?? null
  };
}

export async function validarSesionPayload(payload: Record<string, unknown>): Promise<boolean> {
  if (!payload.id || typeof payload.sessionVersion !== 'number') return false;
  const { obtenerEstadoSesionToken } = await import('@/modules/identidad');
  const current = await obtenerEstadoSesionToken(String(payload.id));
  return (
    !!current &&
    Number(current.sessionVersion) === payload.sessionVersion &&
    current.role.toLowerCase() === String(payload.role).toLowerCase()
  );
}

async function payloadVigente(userData: Parameters<typeof buildPayload>[0]) {
  const { obtenerEstadoSesionToken } = await import('@/modules/identidad');
  const current = await obtenerEstadoSesionToken(String(userData.id));
  if (!current) throw new Error('La cuenta no está activa');
  return buildPayload({ ...current, nick: current.nick ?? undefined });
}

export async function verifyToken(token: string): Promise<AuthenticatedUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return (await validarSesionPayload(payload)) ? (payload as unknown as AuthenticatedUser) : null;
  } catch {
    return null;
  }
}

/** Verify a refresh token with the refresh secret */
export async function verifyRefreshToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getRefreshSecretKey());
    return (await validarSesionPayload(payload)) ? (payload as TokenPayload) : null;
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
  return await new SignJWT(await payloadVigente(userData))
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
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
  return await new SignJWT(await payloadVigente(userData))
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
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
