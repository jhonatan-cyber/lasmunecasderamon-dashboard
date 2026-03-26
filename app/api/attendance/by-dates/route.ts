import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { AttendanceRepository } from '@/lib/repositories/AttendanceRepository';
import { getAuth } from '@/lib/auth/auth-app';

export const GET = withAppApiWrapper(async (request: Request) => {
  const user = await getAuth();
  if (!user)
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const dates = searchParams.get('dates');

  let result;
  if (dates) {
    const dateList = dates.split(',');
    result = await AttendanceRepository.getByDates(user.id.toString(), dateList);
  } else if (startDate && endDate) {
    result = await AttendanceRepository.getByUser(
      user.id.toString(),
      'detalle',
      startDate,
      endDate
    );
  } else {
    return NextResponse.json(
      { success: false, message: 'Faltan parámetros de fecha' },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, data: result });
});
