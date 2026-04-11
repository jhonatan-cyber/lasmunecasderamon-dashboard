import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { AttendanceService } from '@/lib/services/AttendanceService';
import { getAuth } from '@/lib/auth/auth-app';

// register no requiere withAppAuth — el QR puede usarse sin sesión activa
export const POST = withAppApiWrapper(async (request: Request) => {
  const user = await getAuth();
  const body = await request.json();

  if (body.qr_data && !body.qrData) body.qrData = body.qr_data;

  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';

  const result = await AttendanceService.registerAttendance(body, user || undefined, ip);
  return NextResponse.json(result);
});
