import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { ErrorLogService } from '@/lib/services/ErrorLogService';

export const GET = withPublicRoute(async () => {
  const data = await ErrorLogService.getAll();
  return NextResponse.json({ success: true, data });
});

export const POST = withPublicRoute(async (request: Request) => {
  const body = await request.json();
  await ErrorLogService.log(body);
  return NextResponse.json({ success: true });
});
