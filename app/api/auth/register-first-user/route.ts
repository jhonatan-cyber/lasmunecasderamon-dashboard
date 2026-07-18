import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { AuthService } from '@/lib/services/AuthService';
import { loginLimiterApp } from '@/lib/middleware/rateLimit';

export const POST = loginLimiterApp(async (request: Request) => {
  const body = await request.json();
  const result = await AuthService.registerFirstUser(body);
  return NextResponse.json(result);
});
