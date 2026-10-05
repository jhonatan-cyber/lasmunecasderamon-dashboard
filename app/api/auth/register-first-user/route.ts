import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { AuthService } from '@/modules/identidad';

export const POST = withPublicRoute(async (request: Request) => {
  const body = await request.json();
  const result = await AuthService.registerFirstUser(body);
  return NextResponse.json(result);
});
