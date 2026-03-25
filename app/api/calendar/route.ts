import { NextResponse } from 'next/server';
import { CalendarRepository } from '@/lib/repositories/CalendarRepository';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) return NextResponse.json({ success: false, error: 'startDate y endDate son requeridos' }, { status: 400 });

    const data = await CalendarRepository.getActions(startDate, endDate);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error interno del servidor', error: error.message }, { status: 500 });
  }
}
