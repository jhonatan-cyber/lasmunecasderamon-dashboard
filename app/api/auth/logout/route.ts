import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { AuthService } from '@/modules/identidad';
import { cookies } from 'next/headers';
import { verifyRefreshToken } from '@/lib/auth/auth';
import { getAuth } from '@/lib/auth/auth-app';

export const POST = withPublicRoute(async request => {
  const user = await getAuth();
  const cookieStore = await cookies();
  const refreshToken =
    cookieStore.get('refresh_token')?.value || request.headers.get('x-refresh-token');
  const refreshUser = !user && refreshToken ? await verifyRefreshToken(refreshToken) : null;
  const userId = user?.id ?? refreshUser?.id;
  cookieStore.delete('token');
  cookieStore.delete('refresh_token');

  if (userId) await AuthService.logout(String(userId));

  return NextResponse.json({ success: true, message: 'Sesión cerrada' });
});
