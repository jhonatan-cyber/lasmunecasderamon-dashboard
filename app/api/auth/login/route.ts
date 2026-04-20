import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { AuthRepository } from '@/lib/repositories/AuthRepository';
import { cookies } from 'next/headers';
import { loginLimiterApp } from '@/lib/middleware/rateLimit';
import { ApiResponse } from '@/lib/api/api-response';

export const POST = loginLimiterApp(async (request: Request) => {
  try {
    const body = await request.json();
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown';

    const result = await AuthRepository.login(body, ip);

    if (result.success && result.token) {
      const cookieStore = await cookies();
      cookieStore.set('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 // 24h
      });
      return NextResponse.json(result);
    }

    if (result.requiereCodigo) {
      return NextResponse.json({ success: false, ...result });
    }

    return NextResponse.json(result);
  } catch (error) {
    return ApiResponse.error(error);
  }
});
