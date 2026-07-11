import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { AttendanceService } from '@/lib/services/AttendanceService';

export const GET = withAppApiWrapper(async () => {
  const data = await AttendanceService.getHoy();
  return NextResponse.json({ success: true, data });
});
