import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { AuthRepository } from '@/lib/repositories/AuthRepository';

export const GET = withAppApiWrapper(async () => {
  const hasUsers = await AuthRepository.checkUsers();
  return NextResponse.json({ success: true, hasUsers });
});
