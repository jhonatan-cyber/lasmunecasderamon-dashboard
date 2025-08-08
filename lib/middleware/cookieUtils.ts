import { NextApiRequest, NextApiResponse } from 'next';
import Cookies from 'cookies';

export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  maxAge?: number;
  path?: string;
  domain?: string;
}

export function setSecureCookie(
  req: NextApiRequest,
  res: NextApiResponse,
  name: string,
  value: string,
  options: CookieOptions = {}
) {
  const cookies = new Cookies(req, res);
  
  // Detectar si estamos en un entorno con proxy
  const isBehindProxy = process.env.NODE_ENV === 'production';
  const hasHttpsHeader = req.headers['x-forwarded-proto'] === 'https';
  const isHttps = hasHttpsHeader || (!isBehindProxy && req.headers['x-forwarded-proto'] === 'https');
  
  // Configuración por defecto
  const defaultOptions: CookieOptions = {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    path: '/',
    ...options
  };
  
  // En producción detrás de proxy, forzar secure: false si no detectamos HTTPS correctamente
  if (isBehindProxy && !hasHttpsHeader) {
    defaultOptions.secure = false;
    console.log('🔧 Cookie config: Forzando secure: false en producción con proxy');
  }
  
  console.log('📊 Cookie configuration:', {
    name,
    isBehindProxy,
    hasHttpsHeader,
    isHttps,
    secure: defaultOptions.secure,
    sameSite: defaultOptions.sameSite,
    nodeEnv: process.env.NODE_ENV
  });
  
  try {
    cookies.set(name, value, defaultOptions);
    console.log('✅ Cookie set successfully');
    return true;
  } catch (error) {
    console.error('❌ Error setting cookie:', error);
    // Fallback: reintentar sin secure si falló por conexión no encriptada
    try {
      console.log('↩️ Retry setting cookie with secure: false');
      cookies.set(name, value, { ...defaultOptions, secure: false });
      console.log('✅ Cookie set successfully on retry (secure: false)');
      return true;
    } catch (retryError) {
      console.error('❌ Retry also failed setting cookie:', retryError);
      return false;
    }
  }
}

export function getCookie(req: NextApiRequest, res: NextApiResponse, name: string): string | undefined {
  const cookies = new Cookies(req, res);
  return cookies.get(name);
}

export function clearCookie(req: NextApiRequest, res: NextApiResponse, name: string): void {
  const cookies = new Cookies(req, res);
  cookies.set(name, '', {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 0,
    path: '/'
  });
}
