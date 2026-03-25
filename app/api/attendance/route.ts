import { NextResponse } from 'next/server';
import { AttendanceRepository } from '@/lib/repositories/AttendanceRepository';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const resumen = searchParams.get('resumen') === 'true';
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    // For now, getSummary() doesn't take params, but we can pass them in the future
    const data = await AttendanceRepository.getSummary();
    return NextResponse.json({ success: true, data: data || [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error al obtener asistencias', error: error.message }, { status: 500 });
  }
}
