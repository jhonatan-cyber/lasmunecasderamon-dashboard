import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { AttendanceService } from '@/lib/services/AttendanceService';
import { getAuth } from '@/lib/auth/auth-app';
import { sendNotificationToAll } from '@/lib/api/sseService';

export const POST = withPublicRoute(async (request: Request) => {
  const user = await getAuth();
  const body = await request.json();

  if (body.qr_data && !body.qrData) body.qrData = body.qr_data;

  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';

  const result = await AttendanceService.registerAttendance(body, user || undefined, ip);

  if (result.success) {
    // El qrToken no se difunde: es la credencial que acepta este mismo endpoint.
    // Los consumidores identifican al usuario por su id.
    sendNotificationToAll('attendance_registered', {
      user: result.user
    });
  }

  return NextResponse.json(result);
});
