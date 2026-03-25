import { NextResponse } from 'next/server';
import { AttendanceRepository } from '@/lib/repositories/AttendanceRepository';

export async function GET() {
  try {
    const data = await AttendanceRepository.getHoy();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error getting today attendance', error: error.message }, { status: 500 });
  }
}
