import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { CalendarRepository } from '@/lib/repositories/CalendarRepository';
import { jsonWithNormalizedDates } from '@/lib/api/date-response';
import { ValidationError } from '@/lib/errors/errors';

export const GET = withAppApiWrapper(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const type = searchParams.get('type') as 'servicios' | 'ventas';

  if (!startDate || !endDate || !type)
    throw new ValidationError('startDate, endDate y type son requeridos', {
      startDate,
      endDate,
      type
    });

  const data = await CalendarRepository.getData(startDate, endDate, type);
  return jsonWithNormalizedDates({ data, type });
});
