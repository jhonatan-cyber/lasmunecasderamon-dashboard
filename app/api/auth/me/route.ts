import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { getAuth } from '@/lib/auth/auth-app';

export const GET = withAppApiWrapper(async () => {
  const user = await getAuth();
  if (!user) {
    return NextResponse.json({ success: false, message: 'No autenticado' }, { status: 401 });
  }
  return NextResponse.json({ success: true, user });
});
