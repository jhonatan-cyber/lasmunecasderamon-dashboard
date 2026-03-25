import { NextResponse } from 'next/server';
import { AnticipoRepository } from '@/lib/repositories/AnticipoRepository';
import { getAuth } from '@/lib/auth-app';

export async function GET(request: Request) {
  try {
    const user = await getAuth();
    if (!user) return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const dates = searchParams.get('dates');

    let result;
    if (dates) {
      const dateList = dates.split(',');
      result = await AnticipoRepository.getByDates(user.id.toString(), dateList);
    } else if (startDate && endDate) {
      result = await AnticipoRepository.getByUser(user.id.toString(), startDate, endDate);
    } else {
      return NextResponse.json({ success: false, message: 'Faltan parámetros de fecha' }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error interno', error: error.message }, { status: 500 });
  }
}
