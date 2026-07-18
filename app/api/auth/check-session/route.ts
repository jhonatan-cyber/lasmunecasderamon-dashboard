import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { AuthService } from '@/lib/services/AuthService';

export const GET = withRoute({ auth: true, audit: true }, async (_request: Request, { user }: { params: any; user: any }) => {
  const result = await AuthService.checkSession(user.id.toString());
  return NextResponse.json(result);
});
