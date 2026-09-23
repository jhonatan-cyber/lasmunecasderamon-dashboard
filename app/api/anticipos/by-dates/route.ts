import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { AnticipoService } from '@/lib/services/AnticipoService';
import { ValidationError } from '@/lib/errors/errors';

export const GET = withRoute(
  { auth: true, access: 'authenticated', audit: true },
  async (request: Request, { user }: { params: any; user: any }) => {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const dates = searchParams.get('dates');

    let result;
    if (dates) {
      result = await AnticipoService.getByDates(user.id.toString(), dates.split(','));
    } else if (startDate && endDate) {
      result = await AnticipoService.getByUser(user.id.toString(), startDate, endDate);
    } else {
      throw new ValidationError('Faltan parámetros de fecha', { startDate, endDate, dates });
    }

    return NextResponse.json({ success: true, data: result });
  }
);
