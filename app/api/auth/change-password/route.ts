import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import * as argon2 from 'argon2';
import { query } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
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

      const hashedPassword = await argon2.hash(password);
      await query(
        'UPDATE usuarios SET password = ?, force_password_change = 0, fecha_mod = ? WHERE id_usuario = ?',
        [hashedPassword, getNowInBusinessTimezone(), userId]
      );

      return NextResponse.json({
        success: true,
        message: 'Contraseña actualizada exitosamente'
      });
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'Error al cambiar la contraseña' },
        { status: 500 }
      );
    }
  }
);
