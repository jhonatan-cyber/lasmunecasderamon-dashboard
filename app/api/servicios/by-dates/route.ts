import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { ServiceService } from '@/lib/services/ServiceService';

export const GET = withAppApiWrapper(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!startDate || !endDate)
    return NextResponse.json({ success: false, message: 'Fechas requeridas' }, { status: 400 });

  const data = await ServiceService.getByDates(startDate, endDate);
  return NextResponse.json({ success: true, data });
});
