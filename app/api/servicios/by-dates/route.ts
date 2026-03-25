import { NextResponse } from 'next/server';
import { ServiceRepository } from '@/lib/repositories/ServiceRepository';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) return NextResponse.json({ success: false, message: 'Fechas requeridas' }, { status: 400 });

    const data = await ServiceRepository.getByDates(startDate, endDate);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error getting services by dates', error: error.message }, { status: 500 });
  }
}
