import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { AuthService } from '@/modules/identidad';
import { cookies } from 'next/headers';
import { getAuth } from '@/lib/auth/auth-app';

export const POST = withPublicRoute(async () => {
  const cookieStore = await cookies();
  cookieStore.delete('token');
  cookieStore.delete('refresh_token');

  const user = await getAuth();
  if (user) await AuthService.logout(user.id);

  return NextResponse.json({ success: true, message: 'Sesión cerrada' });
});
