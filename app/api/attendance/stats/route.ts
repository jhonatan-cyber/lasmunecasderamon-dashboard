import { NextResponse } from 'next/server';
import { AttendanceRepository } from '@/lib/repositories/AttendanceRepository';

export async function GET() {
  try {
    const data = await AttendanceRepository.getStats();
    return NextResponse.json({ success: true, data: [data] });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error al obtener estadísticas', error: error.message }, { status: 500 });
  }
}
