import { NextResponse } from 'next/server';
import { AttendanceRepository } from '@/lib/repositories/AttendanceRepository';
import { getAuth } from '@/lib/auth-app';

export async function POST(request: Request) {
  try {
    const user = await getAuth();
    const { qr_data } = await request.json();
    if (!qr_data) return NextResponse.json({ success: false, message: 'Código QR no proporcionado' }, { status: 400 });

    const result = await AttendanceRepository.register(qr_data, user || undefined);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Error al registrar asistencia' }, { status: 400 });
  }
}
