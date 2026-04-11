import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';

export const GET = withAppAuth(async (_request: Request, { user }: { params: any; user: any }) => {
  return NextResponse.json({ success: true, user });
});
