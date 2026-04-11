import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { UserRepository } from '@/lib/repositories/UserRepository';

export const GET = withAppAuth(async (_request: Request, { user }: { params: any; user: any }) => {
  const userData = await UserRepository.getById(user.id.toString());
  if (!userData)
    return NextResponse.json({ success: false, message: 'Usuario no encontrado' }, { status: 404 });

  return NextResponse.json({
    success: true,
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
  });
});
