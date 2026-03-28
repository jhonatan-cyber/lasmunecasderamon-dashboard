import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { getAuth } from '@/lib/auth/auth-app';
import { UserRepository } from '@/lib/repositories/UserRepository';

export const GET = withAppApiWrapper(async () => {
  const user = await getAuth();
  if (!user) {
    return NextResponse.json({ success: false, message: 'No autenticado' }, { status: 401 });
  }

  const fullUser = await UserRepository.getById(user.id.toString());
  if (!fullUser) {
    return NextResponse.json({ success: false, message: 'Usuario no encontrado' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    user: {
      id: fullUser.id,
      username: fullUser.nick || fullUser.name,
      name: fullUser.name,
      lastName: fullUser.lastName,
      email: fullUser.email,
      role: fullUser.role,
      foto: fullUser.foto,
      nick: fullUser.nick,
      phone: fullUser.phone,
      address: fullUser.address,
      estado_civil: fullUser.maritalStatus,
    }
  });
});
