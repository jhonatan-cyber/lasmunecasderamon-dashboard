import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { AttendanceRepository } from '@/lib/repositories/AttendanceRepository';
import { getAuth } from '@/lib/auth/auth-app';

export const GET = withAppApiWrapper(async (request: Request) => {
  const user = await getAuth();
  if (!user)
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get('tipo') || undefined;
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;

  const data = await AttendanceRepository.getByUser(user.id.toString(), tipo, startDate, endDate);
  return NextResponse.json({ success: true, data });
});
