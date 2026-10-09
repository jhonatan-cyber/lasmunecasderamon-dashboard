import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { getAuth } from '@/lib/auth/auth-app';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { registrarAsistencia } from '@/modules/asistencia';

export const POST = withPublicRoute(async (request: Request) => {
  const user = await getAuth();
  const body = await request.json();

  if (body.qr_data && !body.qrData) body.qrData = body.qr_data;

  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';

  const result = await registrarAsistencia(body, user || undefined, ip);

  if (result.success) {
    sendNotificationToAll('attendance_registered', {
      user: result.user
    });
  }

  return NextResponse.json(result);
});
