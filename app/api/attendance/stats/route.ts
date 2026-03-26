import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { AttendanceRepository } from '@/lib/repositories/AttendanceRepository';

export const GET = withAppApiWrapper(async () => {
  const data = await AttendanceRepository.getStats();
  return NextResponse.json({ success: true, data: [data] });
});
