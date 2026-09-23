import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { AttendanceService } from '@/lib/services/AttendanceService';

export const POST = withRoute({ auth: true, audit: true }, async (request: Request) => {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
  try {
    const result = await AttendanceService.registerMasivoHoy(ip);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Error en el registro masivo' },
      { status: 500 }
    );
  }
});
