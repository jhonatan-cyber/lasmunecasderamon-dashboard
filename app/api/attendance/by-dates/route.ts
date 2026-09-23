import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { AttendanceService } from '@/lib/services/AttendanceService';
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
      result = await AttendanceService.getByDates(user.id.toString(), dates.split(','));
    } else if (startDate && endDate) {
      result = await AttendanceService.getByUser(user.id.toString(), 'detalle', startDate, endDate);
    } else {
      throw new ValidationError('Faltan parámetros de fecha', { startDate, endDate, dates });
    }

    return NextResponse.json({ success: true, data: result });
  }
);
