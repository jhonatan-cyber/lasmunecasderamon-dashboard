import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { getAuth } from '@/lib/auth/auth-app';

export const GET = withAppApiWrapper(async () => {
  const userAuth = await getAuth();
  if (!userAuth)
    return NextResponse.json({ success: false, message: 'No session' }, { status: 401 });

  return NextResponse.json({ success: true, user: userAuth });
});
