import { NextResponse } from 'next/server';
import { AttendanceRepository } from '@/lib/repositories/AttendanceRepository';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    if (!id) return NextResponse.json({ success: false, message: 'Falta el id' }, { status: 400 });

    const data = await AttendanceRepository.getByUser(id, 'detalle');
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error al obtener detalle de asistencia', error: error.message }, { status: 500 });
  }
}
