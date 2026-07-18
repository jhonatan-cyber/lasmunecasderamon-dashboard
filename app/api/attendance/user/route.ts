import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { AttendanceService } from '@/lib/services/AttendanceService';

export const GET = withRoute({ auth: true, audit: true }, async (request: Request, { user }: { params: any; user: any }) => {
  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get('tipo') || undefined;
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;

  const data = await AttendanceService.getByUser(user.id.toString(), tipo, startDate, endDate);
  return NextResponse.json({ success: true, data });
});
