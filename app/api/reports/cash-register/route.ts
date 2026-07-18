import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { ReportRepository } from '@/lib/repositories/ReportRepository';

export const GET = withPublicRoute(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const period = (searchParams.get('period') || 'today') as any;
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  const data = await ReportRepository.getCashRegisterReport(period, startDate, endDate);
  return NextResponse.json({ success: true, data });
});
