import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { ErrorLogRepository } from '@/lib/repositories/ErrorLogRepository';

export const GET = withAppApiWrapper(async () => {
  const data = await ErrorLogRepository.getAll();
  return NextResponse.json({ success: true, data });
});

export const POST = withAppApiWrapper(async (request: Request) => {
  const body = await request.json();
  await ErrorLogRepository.log(body);
  return NextResponse.json({ success: true });
});
