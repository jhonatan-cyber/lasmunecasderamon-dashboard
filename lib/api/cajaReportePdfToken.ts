import { SignJWT, jwtVerify } from 'jose';
import { env } from '@/lib/utils/env';

const PURPOSE = 'caja-reporte-pdf';
const secret = () => new TextEncoder().encode(env.JWT_SECRET);

export async function crearTokenCajaReporte(cajaId: string | number): Promise<string> {
  return new SignJWT({ purpose: PURPOSE, cajaId: String(cajaId) })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(secret());
}

export async function leerTokenCajaReporte(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.purpose === PURPOSE && typeof payload.cajaId === 'string'
      ? payload.cajaId
      : null;
  } catch {
    return null;
  }
}
