import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { AnticipoRepository } from '@/lib/repositories/AnticipoRepository';
import { ValidationError } from '@/lib/errors/errors';

export const GET = withAppAuth(async (request: Request, { user }: { params: any; user: any }) => {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const dates = searchParams.get('dates');

  let result;
  if (dates) {
    result = await AnticipoRepository.getByDates(user.id.toString(), dates.split(','));
  } else if (startDate && endDate) {
    result = await AnticipoRepository.getByUser(user.id.toString(), startDate, endDate);
  } else {
    throw new ValidationError('Faltan parámetros de fecha', { startDate, endDate, dates });
  }

  return NextResponse.json({ success: true, data: result });
});
