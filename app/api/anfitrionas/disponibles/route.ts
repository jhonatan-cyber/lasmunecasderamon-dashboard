import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { UserRepository } from '@/lib/repositories/UserRepository';

export const GET = withAppApiWrapper(async () => {
  const data = await UserRepository.getAvailableAnfitrionas();
  return NextResponse.json({ success: true, data });
});
