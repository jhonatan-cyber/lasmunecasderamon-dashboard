import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { UserRepository } from '@/lib/repositories/UserRepository';
import { getAuth } from '@/lib/auth/auth-app';

export const GET = withAppApiWrapper(async () => {
  const user = await getAuth();
  if (!user)
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

  const userData = await UserRepository.getById(user.id.toString());
  if (!userData)
    return NextResponse.json({ success: false, message: 'Usuario no encontrado' }, { status: 404 });

  return NextResponse.json({
    success: true,
    status: userData.status,
    estado_servicio: userData.estado_servicio,
    user: {
      id: userData.id,
      nombre: userData.name,
      email: userData.email,
      role: userData.role,
      status: userData.status
    }
  });
});
