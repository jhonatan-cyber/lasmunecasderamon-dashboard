import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { AttendanceService } from '@/lib/services/AttendanceService';

export const POST = withRoute(
  { auth: true, audit: true },
  async (request: Request, { user }: { params: any; user: { id: string } }) => {
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown';

    const result = await AttendanceService.selfRegister({ id: user.id }, ip);
    return NextResponse.json(result);
  }
);
