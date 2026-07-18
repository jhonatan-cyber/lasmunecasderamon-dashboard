import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { getAuth } from '@/lib/auth/auth-app';

export const GET = withPublicRoute(async () => {
  const user = await getAuth();
  return NextResponse.json({ success: true, user });
});
