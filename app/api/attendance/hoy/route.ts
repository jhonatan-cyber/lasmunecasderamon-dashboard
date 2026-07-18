import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { AttendanceService } from '@/lib/services/AttendanceService';

export const GET = withPublicRoute(async () => {
  const data = await AttendanceService.getHoy();
  return NextResponse.json({ success: true, data });
});
