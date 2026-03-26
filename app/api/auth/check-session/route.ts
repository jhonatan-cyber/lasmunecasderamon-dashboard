import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { AuthRepository } from '@/lib/repositories/AuthRepository';
import { getAuth } from '@/lib/auth/auth-app';

export const GET = withAppApiWrapper(async () => {
  const userAuth = await getAuth();
  if (!userAuth)
    return NextResponse.json({ success: false, message: 'No session' }, { status: 401 });

  const result = await AuthRepository.checkSession(userAuth.id.toString());
  return NextResponse.json(result);
});
