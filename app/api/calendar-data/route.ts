import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { CalendarRepository } from '@/lib/repositories/CalendarRepository';

export const GET = withAppApiWrapper(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const type = searchParams.get('type');

  if (!startDate || !endDate || !type) {
    return NextResponse.json(
      { success: false, error: 'startDate, endDate y type son requeridos' },
      { status: 400 }
    );
  }

  const data = await CalendarRepository.getData(startDate, endDate, type as 'servicios' | 'ventas');
  return NextResponse.json({ success: true, data });
});