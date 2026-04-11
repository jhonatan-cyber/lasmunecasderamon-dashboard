import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { AuthRepository } from '@/lib/repositories/AuthRepository';
import { cookies } from 'next/headers';
import { getAuth } from '@/lib/auth/auth-app';

// logout no requiere withAppAuth — debe funcionar incluso con token expirado
export const POST = withAppApiWrapper(async () => {
  const user = await getAuth();
  if (user) await AuthRepository.logout(user.id);

  const cookieStore = await cookies();
  cookieStore.delete('token');

  return NextResponse.json({ success: true, message: 'Sesión cerrada' });
});
