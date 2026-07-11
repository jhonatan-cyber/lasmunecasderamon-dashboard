import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { CalendarService } from '@/lib/services/CalendarService';

export const GET = withAppApiWrapper(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!startDate || !endDate)
    return NextResponse.json(
      { success: false, error: 'startDate y endDate son requeridos' },
      { status: 400 }
    );

  const data = await CalendarService.getActions(startDate, endDate);
  return NextResponse.json({ success: true, data });
});
