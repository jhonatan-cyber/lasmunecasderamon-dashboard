import { cookies } from 'next/headers';
import { generateAccessToken, generateRefreshToken } from '@/lib/auth/auth';
import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { cambiarPassword } from '@/modules/identidad';
import { changePasswordSchema } from '@/lib/validations/auth';

export const POST = withRoute(
  { auth: true, access: 'authenticated', audit: true },
  async (request: Request, { user }: { user: any }) => {
    try {
      const body = await request.json();
      const parsed = changePasswordSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            message: parsed.error.issues[0]?.message ?? 'Datos inválidos'
          },
          { status: 400 }
        );
      }
      const { password } = parsed.data;

      const userId = user.id?.toString();
      if (!userId) {
        return NextResponse.json(
          { success: false, message: 'Usuario no identificado' },
          { status: 401 }
        );
      }

      await cambiarPassword(userId, password);
      const [token, refreshToken] = await Promise.all([
        generateAccessToken(user),
        generateRefreshToken(user)
      ]);
      const cookieStore = await cookies();
      const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        path: '/'
      };
      cookieStore.set('token', token, { ...options, maxAge: 15 * 60 });
      cookieStore.set('refresh_token', refreshToken, { ...options, maxAge: 7 * 24 * 60 * 60 });

      return NextResponse.json({
        success: true,
        message: 'Contraseña actualizada exitosamente',
        token,
        refreshToken
      });
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'Error al cambiar la contraseña' },
        { status: 500 }
      );
    }
  }
);
