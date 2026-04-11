import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { AttendanceRepository } from '@/lib/repositories/AttendanceRepository';

export const GET = withAppAuth(async (request: Request, { user }: { params: any; user: any }) => {
  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get('tipo') || undefined;
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;

  const data = await AttendanceRepository.getByUser(user.id.toString(), tipo, startDate, endDate);
  return NextResponse.json({ success: true, data });
});
