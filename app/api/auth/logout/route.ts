import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { AuthRepository } from '@/lib/repositories/AuthRepository';
import { cookies } from 'next/headers';
import { getAuth } from '@/lib/auth/auth-app';

export const POST = withAppApiWrapper(async () => {
  const user = await getAuth();
  if (user) await AuthRepository.logout(user.id);

  const cookieStore = await cookies();
  cookieStore.delete('token');

  return NextResponse.json({ success: true, message: 'Sesión cerrada' });
});
