import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { UserService } from '@/modules/identidad';

export const GET = withPublicRoute(async () => {
  const data = await UserService.getStaff();
  return NextResponse.json({ success: true, data });
});
