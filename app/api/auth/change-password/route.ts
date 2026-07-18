import { NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/AuthService';
import { withRoute } from '@/lib/api/withRoute';
import * as argon2 from 'argon2';
import { query } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';

export const POST = withRoute({ auth: true, audit: true }, async (request: Request, { user }: { user: any }) => {
  try {
    const body = await request.json();
    const { password, confirmPassword } = body;

    if (!password || password.trim().length < 8) {
      return NextResponse.json(
        { success: false, message: 'La contraseña debe tener al menos 8 caracteres' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { success: false, message: 'Las contraseñas no coinciden' },
        { status: 400 }
      );
    }

    const userId = user.id?.toString();
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Usuario no identificado' },
        { status: 401 }
      );
    }

    const hashedPassword = await argon2.hash(password.trim());
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
});
