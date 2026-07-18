import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { AuthService } from '@/lib/services/AuthService';

export const GET = withPublicRoute(async () => {
  const hasUsers = await AuthService.checkUsers();
  return NextResponse.json({ success: true, hasUsers });
});
