import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { ReportService } from '@/modules/reportes';

export const GET = withPublicRoute(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const period = (searchParams.get('period') || 'today') as any;
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  const data = await ReportService.getSalesReport(period, startDate, endDate);
  return NextResponse.json({ success: true, data });
});
