import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { AttendanceRepository } from '@/lib/repositories/AttendanceRepository';

export const GET = withAppApiWrapper(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const resumen = searchParams.get('resumen') === 'true';
  const month = searchParams.get('month');
  const year = searchParams.get('year');

  // For now, getSummary() doesn't take params, but we can pass them in the future
  const data = await AttendanceRepository.getSummary();
  return NextResponse.json({ success: true, data: data || [] });
});
