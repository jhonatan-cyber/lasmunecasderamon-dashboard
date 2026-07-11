import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { AuthService } from '@/lib/services/AuthService';
import { cookies } from 'next/headers';
import { getAuth } from '@/lib/auth/auth-app';

export const POST = withAppApiWrapper(async () => {
  const user = await getAuth();
  if (user) await AuthService.logout(user.id);

  const cookieStore = await cookies();
  cookieStore.delete('token');

  return NextResponse.json({ success: true, message: 'Sesión cerrada' });
});
