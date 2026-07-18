import { NextRequest, NextResponse } from 'next/server';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '@/lib/auth/auth';
import { cookies } from 'next/headers';
import { loginLimiterApp } from '@/lib/middleware/rateLimit';
import { ApiResponse } from '@/lib/api/api-response';

/**
 * POST /api/auth/refresh
 *
 * Renueva el access token usando el refresh token.
 * Soporta dos fuentes para el token (en orden de precedencia):
 * 1. Header `x-refresh-token` (para clientes móviles que no pueden setear httpOnly cookies)
 * 2. Cookie `refresh_token` (para el dashboard web con httpOnly)
 *
 * Implementa refresh token rotation: cada renovación genera un nuevo refresh token.
 * Cuando se usa header (no cookie), devuelve el nuevo refresh token en el body.
 */
export const POST = loginLimiterApp(async (request: NextRequest) => {
  try {
    const cookieStore = await cookies();
    // Precedencia: header > cookie
    const refreshTokenHeader = request.headers.get('x-refresh-token');
    const refreshToken = refreshTokenHeader || cookieStore.get('refresh_token')?.value;
    const isHeaderAuth = !!refreshTokenHeader;

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, message: 'No hay refresh token', code: 'NO_REFRESH_TOKEN' },
        { status: 401 }
      );
    }

    // Verificar refresh token
    const payload = await verifyRefreshToken(refreshToken);
    if (!payload) {
      // Refresh token inválido/expirado — limpiar cookies
      cookieStore.delete('token');
      cookieStore.delete('refresh_token');
      return NextResponse.json(
        { success: false, message: 'Refresh token inválido o expirado', code: 'INVALID_REFRESH_TOKEN' },
        { status: 401 }
      );
    }

    // Generar nuevos tokens (rotation)
    if (!payload.id || !payload.role) {
      return NextResponse.json(
        { success: false, message: 'Refresh token inválido: datos incompletos', code: 'INVALID_REFRESH_TOKEN' },
        { status: 401 }
      );
    }
    const userData = {
      id: payload.id as string | number,
      username: String(payload.username || payload.name || ''),
      name: String(payload.name || ''),
      lastName: String(payload.lastName || ''),
      nick: payload.nick ? String(payload.nick) : undefined,
      email: String(payload.email || ''),
      role: String(payload.role)
    };

    const [newAccessToken, newRefreshToken] = await Promise.all([
      generateAccessToken(userData),
      generateRefreshToken(userData)
    ]);

    const isProduction = process.env.NODE_ENV === 'production';

    // Setear cookie de access token (útil para dashboard web via proxy)
    cookieStore.set('token', newAccessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60 // 15 minutos
    });

    if (isHeaderAuth) {
      // Mobile: devolver refresh token en body (no puede leer httpOnly cookies)
      return NextResponse.json({
        success: true,
        token: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 15 * 60
      });
    }

    // Web: setear refresh token como cookie httpOnly
    cookieStore.set('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 // 7 días
    });

    return NextResponse.json({
      success: true,
      token: newAccessToken,
      expiresIn: 15 * 60
    });
  } catch (error) {
    return ApiResponse.error(error);
  }
});
