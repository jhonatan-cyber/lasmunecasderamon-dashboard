import { NextResponse } from 'next/server';
import { iniciarSesion } from '@/workflows/autenticacion';
import { generateRefreshToken } from '@/lib/auth/auth';
import { cookies } from 'next/headers';
import { ApiResponse } from '@/lib/api/api-response';

// ponytail: rate limiting handled in proxy.ts via redisRateLimit (Redis + memory fallback)
export const POST = async (request: Request) => {
  try {
    const body = await request.json();
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown';

    const result = await iniciarSesion(body, ip);

    if (result.success && result.token) {
      const cookieStore = await cookies();
      const isProduction = process.env.NODE_ENV === 'production';

      // Access token (15 min) — cookie httpOnly
      cookieStore.set('token', result.token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
        path: '/',
        maxAge: 15 * 60
      });

      // Refresh token (7 días) — cookie httpOnly + body para clientes móviles
      // (no pueden leer cookies httpOnly y sin él la sesión móvil duraría 15 min).
      let refreshToken: string | null = null;
      const userData = (result as any).user as Record<string, unknown> | undefined;
      if (userData && userData.id) {
        try {
          refreshToken = await generateRefreshToken({
            id: userData.id as string | number,
            username: String(userData.username || userData.name || ''),
            name: String(userData.name || ''),
            lastName: String(userData.lastName || ''),
            nick: userData.nick ? String(userData.nick) : undefined,
            email: String(userData.email || ''),
            role: String(userData.role || '')
          });
          cookieStore.set('refresh_token', refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'strict',
            path: '/',
            maxAge: 7 * 24 * 60 * 60
          });
        } catch {
          // Refresh token no crítico para el login inicial
          refreshToken = null;
        }
      }

      return NextResponse.json(refreshToken ? { ...result, refreshToken } : result);
    }

    if (result.requiereCodigo) {
      return NextResponse.json({ success: false, ...result });
    }

    return NextResponse.json(result);
  } catch (error) {
    return ApiResponse.error(error);
  }
};
