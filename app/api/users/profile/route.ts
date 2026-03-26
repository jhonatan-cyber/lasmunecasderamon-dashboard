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
    data: {
      id: userData.id,
      nombre: userData.name,
      apellido: userData.lastName,
      email: userData.email,
      telefono: userData.phone,
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
});
