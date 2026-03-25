import { NextResponse } from 'next/server';
import { CalendarRepository } from '@/lib/repositories/CalendarRepository';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const type = searchParams.get('type') as 'servicios' | 'ventas';

    if (!startDate || !endDate || !type) return NextResponse.json({ message: 'Parámetros faltantes' }, { status: 400 });

    const data = await CalendarRepository.getData(startDate, endDate, type);
    return NextResponse.json({ data, type });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error interno del servidor', error: error.message }, { status: 500 });
  }
}
