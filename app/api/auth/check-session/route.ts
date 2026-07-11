import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { AuthService } from '@/lib/services/AuthService';

export const GET = withAppAuth(async (_request: Request, { user }: { params: any; user: any }) => {
  const result = await AuthService.checkSession(user.id.toString());
  return NextResponse.json(result);
});
