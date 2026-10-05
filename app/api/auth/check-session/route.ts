import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { AuthService } from '@/modules/identidad';

export const GET = withRoute(
  { auth: true, access: 'authenticated', audit: true },
  async (_request: Request, { user }: { params: any; user: any }) => {
    const result = await AuthService.checkSession(user.id.toString());
    return NextResponse.json(result);
  }
);
