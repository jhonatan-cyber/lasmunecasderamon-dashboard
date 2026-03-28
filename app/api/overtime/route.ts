import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { OvertimeRepository } from '@/lib/repositories/OvertimeRepository';
import { getAuth } from '@/lib/auth/auth-app';
import { ApiResponse } from '@/lib/api/api-response';

export const GET = withAppApiWrapper(async (request: Request) => {
  const userAuth = await getAuth();
  if (!userAuth)
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const userIdInQuery = searchParams.get('userId');

  // Policy: only admins can see others, non-admins see only theirs
  const isAdmin = userAuth.role?.toLowerCase() === 'administrador';
  const targetUserId = isAdmin ? userIdInQuery || undefined : userAuth.id;

  const data = await OvertimeRepository.getAll(targetUserId);
  return ApiResponse.success(data);
});

export const POST = withAppApiWrapper(async (request: Request) => {
  const userAuth = await getAuth();
  if (!userAuth)
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

  const { usuario_id, hora, monto, device_date } = await request.json();
  if (!usuario_id || !hora || !monto)
    return NextResponse.json(
      { success: false, message: 'Todos los campos son requeridos' },
      { status: 400 }
    );

  const id = await OvertimeRepository.create({ usuario_id, hora, monto, device_date });
  return ApiResponse.created({ id }, 'Hora extra creada exitosamente');
});
