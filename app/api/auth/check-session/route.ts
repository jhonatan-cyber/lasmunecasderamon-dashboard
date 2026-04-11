import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { AuthRepository } from '@/lib/repositories/AuthRepository';

export const GET = withAppAuth(async (_request: Request, { user }: { params: any; user: any }) => {
  const result = await AuthRepository.checkSession(user.id.toString());
  return NextResponse.json(result);
});
