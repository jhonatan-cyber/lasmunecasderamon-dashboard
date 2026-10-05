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
        id: userData.id,
        nombre: userData.name,
        apellido: userData.lastName,
        email: userData.email,
        telefono: userData.phone,
        direccion: userData.address,
        estado_civil: userData.maritalStatus,
        run: userData.run,
        nick: userData.nick,
        rol_id: userData.rol_id,
        role: userData.role,
        foto: userData.foto,
        status: userData.status,
        estado_servicio: userData.estado_servicio,
        created_at: userData.created_at
      }
    });
  }
);
