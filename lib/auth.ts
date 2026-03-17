import jwt from 'jsonwebtoken';
import { query, generateUUID } from '@/lib/db';
import { getSystemTimezone } from './timezoneService';

export interface AuthenticatedUser {
  id: number;
  userId: number;
  username: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export function verifyToken(token: string): AuthenticatedUser | null {
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'default_secret'
    ) as AuthenticatedUser;
    
    return decoded;
  } catch (error) {
   
    return null;
  }
}

export function generateToken(userData: {
  id: number;
  username: string;
  email: string;
  role: string;
}): string {
  return jwt.sign(
    {
      id: userData.id,
      userId: userData.id, 
      username: userData.username,
      email: userData.email,
      role: userData.role
    },
    process.env.JWT_SECRET || 'default_secret',
    { expiresIn: '24h' }
  );
}

export function extractToken(req: any): string | null {
  const auth = req.headers?.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return auth.replace('Bearer ', '');
  }

  if (req.cookies?.token) {
    return req.cookies.token;
  }

  return null;
}

// Registra login para TODOS los usuarios sin excepción de rol ni horario
export async function registrarLogin(usuarioId: string | number, ip?: string): Promise<void> {
  try {
    const ipLimpia = ip?.split(',')[0].trim() || null;
    const tz = getSystemTimezone();
    const ahora = new Date();
    const horaLocal = parseInt(
      new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hour12: false }).format(ahora)
    );
    // Formatear fecha/hora local del negocio para guardar en BD
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).formatToParts(ahora);
    const get = (type: string) => parts.find(p => p.type === type)?.value || '0';
    const lastLogin = `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
    // Después de las 23:00 se asume que está en el local trabajando
    const enLocal = horaLocal >= 23 ? 1 : 0;
    await query('DELETE FROM logins WHERE usuario_id = ?', [usuarioId]);
    await query(
      'INSERT INTO logins (id_login, usuario_id, last_login, estado, ip_address, en_local) VALUES (?, ?, ?, 1, ?, ?)',
      [generateUUID(), usuarioId, lastLogin, ipLimpia, enLocal]
    );
  } catch (error) {
    console.error('❌ [LOGIN] Error al registrar login:', error);
  }
}
