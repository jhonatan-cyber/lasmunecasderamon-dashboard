import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { AuthService } from '@/lib/services/AuthService';
import { cookies } from 'next/headers';
import { getAuth } from '@/lib/auth/auth-app';

export const POST = withPublicRoute(async () => {
  const user = await getAuth();
  if (user) await AuthService.logout(user.id);

  const cookieStore = await cookies();
  cookieStore.delete('token');
  cookieStore.delete('refresh_token');

  return NextResponse.json({ success: true, message: 'Sesión cerrada' });
});
