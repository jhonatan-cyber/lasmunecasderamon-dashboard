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
