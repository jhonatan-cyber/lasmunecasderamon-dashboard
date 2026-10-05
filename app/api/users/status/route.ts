import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { UserService } from '@/modules/identidad';

export const GET = withRoute(
  { auth: true, access: 'authenticated', audit: true },
  async (_request: Request, { user }: { params: any; user: any }) => {
    const userData = await UserService.getById(user.id.toString());
    if (!userData)
      return NextResponse.json(
        { success: false, message: 'Usuario no encontrado' },
        { status: 404 }
      );

    return NextResponse.json({
      success: true,
      data: {
        status: userData.status,
        estado_servicio: userData.estado_servicio,
        user: {
          id: userData.id,
          nick: userData.nick,
          name: userData.name,
          lastName: userData.lastName,
          role: userData.role,
          foto: userData.foto
        }
      }
    });
  }
);
