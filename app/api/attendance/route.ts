import { NextResponse } from 'next/server';
import { withAppApiWrapper, withAppAuth } from '@/lib/api/app-api-wrapper';
import { AttendanceRepository } from '@/lib/repositories/AttendanceRepository';
import { getAuth } from '@/lib/auth/auth-app';

export const GET = withAppApiWrapper(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const resumen = searchParams.get('resumen') === 'true';
  const month = searchParams.get('month');
  const year = searchParams.get('year');

  // For now, getSummary() doesn't take params, but we can pass them in the future
  const data = await AttendanceRepository.getSummary();
  return NextResponse.json({ success: true, data: data || [] });
});

export const POST = withAppAuth(async (request: Request, { user }: { params: any; user: any }) => {
  const body = await request.json();
  const { usuario_id, fecha, hora, estado } = body;

  if (!usuario_id) {
    return NextResponse.json(
      { success: false, message: 'usuario_id es requerido' },
      { status: 400 }
    );
  }

  try {
    const result = await AttendanceRepository.registerManual(usuario_id, fecha, hora, estado, user);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Error al registrar asistencia' },
      { status: 500 }
    );
  }
});
