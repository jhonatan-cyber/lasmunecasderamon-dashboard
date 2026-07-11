import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { ErrorLogService } from '@/lib/services/ErrorLogService';

export const GET = withAppApiWrapper(async () => {
  const data = await ErrorLogService.getAll();
  return NextResponse.json({ success: true, data });
});

export const POST = withAppApiWrapper(async (request: Request) => {
  const body = await request.json();
  await ErrorLogService.log(body);
  return NextResponse.json({ success: true });
});
