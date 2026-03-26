import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { AttendanceService } from '@/lib/services/AttendanceService';
import { getAuth } from '@/lib/auth/auth-app';

export const POST = withAppApiWrapper(async (request: Request) => {
  const user = await getAuth();
  const body = await request.json();

  // Si viene como qr_data (snake_case), lo mapeamos a qrData para el esquema
  if (body.qr_data && !body.qrData) {
    body.qrData = body.qr_data;
  }

  const result = await AttendanceService.registerAttendance(body, user || undefined);
  return NextResponse.json(result);
});
