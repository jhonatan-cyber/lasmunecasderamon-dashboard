import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { resetPasswordSchema } from '@/lib/validations/auth';
import { AuthRepository } from '@/lib/repositories/AuthRepository';
import { loginLimiterApp } from '@/lib/middleware/rateLimit';

export const POST = loginLimiterApp(async (request: Request) => {
  const body = await request.json();
  const validated = resetPasswordSchema.parse(body);

  const result = await AuthRepository.resetPassword(validated.run);
  return NextResponse.json(result);
});
