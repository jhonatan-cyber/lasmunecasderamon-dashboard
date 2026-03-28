import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { resetPasswordSchema } from '@/lib/validations/auth';
import { AuthRepository } from '@/lib/repositories/AuthRepository';

export const POST = withAppApiWrapper(async (request: Request) => {
  const body = await request.json();
  const validated = resetPasswordSchema.parse(body);

  const result = await AuthRepository.resetPassword(validated.run);
  return NextResponse.json(result);
});
