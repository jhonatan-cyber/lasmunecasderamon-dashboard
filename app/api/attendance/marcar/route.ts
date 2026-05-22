import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { AttendanceRepository } from '@/lib/repositories/AttendanceRepository';

export const POST = withAppAuth(
  async (request: Request, { user }: { params: any; user: { id: string } }) => {
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown';

    const result = await AttendanceRepository.selfRegister({ id: user.id }, ip);
    return NextResponse.json(result);
  }
);
