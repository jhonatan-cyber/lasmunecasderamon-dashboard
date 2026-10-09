import { NextResponse } from 'next/server';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '@/lib/auth/auth';
import { cookies } from 'next/headers';
import { withPublicRoute } from '@/lib/api/withRoute';
import { ApiResponse } from '@/lib/api/api-response';

export const POST = withPublicRoute(async (request: Request) => {
  try {
    const cookieStore = await cookies();
    const refreshTokenHeader = request.headers.get('x-refresh-token');
    const refreshToken = refreshTokenHeader || cookieStore.get('refresh_token')?.value;
    const isHeaderAuth = !!refreshTokenHeader;

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, message: 'No hay refresh token', code: 'NO_REFRESH_TOKEN' },
        { status: 401 }
      );
    }

    const payload = await verifyRefreshToken(refreshToken);
    if (!payload) {
      cookieStore.delete('token');
      cookieStore.delete('refresh_token');
      return NextResponse.json(
        {
          success: false,
          message: 'Refresh token inválido o expirado',
          code: 'INVALID_REFRESH_TOKEN'
        },
        { status: 401 }
      );
    }

    if (!payload.id || !payload.role) {
      return NextResponse.json(
        {
          success: false,
          message: 'Refresh token inválido: datos incompletos',
          code: 'INVALID_REFRESH_TOKEN'
        },
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
    cookieStore.set('token', newAccessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
      maxAge: 15 * 60
    });

    if (isHeaderAuth) {
      return NextResponse.json({
        success: true,
        token: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 15 * 60
      });
    }

    cookieStore.set('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60
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
