import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';

export const GET = withRoute(
  { auth: true, access: 'authenticated', audit: true },
  async (_request: Request, { user }: { params: any; user: any }) => {
    return NextResponse.json({ success: true, user });
  }
);
