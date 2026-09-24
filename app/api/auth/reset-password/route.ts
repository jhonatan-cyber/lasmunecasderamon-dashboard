import { NextResponse } from 'next/server';
import { resetPasswordSchema } from '@/lib/validations/auth';
import { AuthService } from '@/lib/services/AuthService';
import { withPublicRoute } from '@/lib/api/withRoute';

export const POST = withPublicRoute(async (request: Request) => {
  const body = await request.json();
  const validated = resetPasswordSchema.parse(body);

  const result = await AuthService.resetPassword(validated.run);
  return NextResponse.json(result);
});
