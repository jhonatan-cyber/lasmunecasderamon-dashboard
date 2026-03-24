import type { NextApiRequest, NextApiResponse } from 'next';
import Cookies from 'cookies';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';
import { clearCookie } from '@/lib/middleware/cookieUtils';
import { logger } from '@/lib/logger';

const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
  } catch {
    return null;
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookies = new Cookies(req, res);

  try {
    const token = cookies.get('token');

    if (token) {
      const decoded = verifyToken(token) as { id?: number | string } | null;

      if (decoded && decoded.id) {
        await query('DELETE FROM logins WHERE usuario_id = ?', [decoded.id]);
      }
    }
  } catch (error) {
    logger.error('[LOGOUT] Error al desactivar login', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  clearCookie(req, res, 'token');

  try {
    cookies.set('token', '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0 });
    cookies.set('token', '', { httpOnly: true, secure: false, sameSite: 'lax', path: '/', maxAge: 0 });
  } catch {
    // Ignore cookie cleanup errors.
  }

  return res.status(200).json({ success: true, message: 'Sesion cerrada' });
}
