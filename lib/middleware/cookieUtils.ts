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
  const isBehindProxy = process.env.NODE_ENV === 'production';
  const hasHttpsHeader = req.headers['x-forwarded-proto'] === 'https';
  const isHttps =
    hasHttpsHeader || (!isBehindProxy && req.headers['x-forwarded-proto'] === 'https');

  const defaultOptions: CookieOptions = {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
    path: '/',
    ...options
  };

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
    return true;
  } catch (error) {
    try {
      cookies.set(name, value, { ...defaultOptions, secure: false });

      return true;
    } catch (retryError) {
      return false;
    }
  }
}

export function getCookie(
  req: NextApiRequest,
  res: NextApiResponse,
  name: string
): string | undefined {
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
