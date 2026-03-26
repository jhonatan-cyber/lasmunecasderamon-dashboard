import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { AuthRepository } from '@/lib/repositories/AuthRepository';

export const POST = withAppApiWrapper(async (request: Request) => {
  const body = await request.json();
  const result = await AuthRepository.registerFirstUser(body);
  return NextResponse.json(result);
});
