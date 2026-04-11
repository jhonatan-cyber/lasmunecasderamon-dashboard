import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { OvertimeRepository } from '@/lib/repositories/OvertimeRepository';
import { ApiResponse } from '@/lib/api/api-response';
import { ValidationError } from '@/lib/errors/errors';

export const GET = withAppAuth(async (request: Request, { user }: { params: any; user: any }) => {
  const { searchParams } = new URL(request.url);
  const userIdInQuery = searchParams.get('userId');
  const isAdmin = user.role?.toLowerCase() === 'administrador';
  const targetUserId = isAdmin ? userIdInQuery || undefined : user.id;

  const data = await OvertimeRepository.getAll(targetUserId);
  return ApiResponse.success(data);
});

export const POST = withAppAuth(async (request: Request) => {
  const { usuario_id, hora, monto, device_date } = await request.json();
  if (!usuario_id || !hora || !monto)
    throw new ValidationError('usuario_id, hora y monto son requeridos', {
      usuario_id,
      hora,
      monto
    });

  const id = await OvertimeRepository.create({ usuario_id, hora, monto, device_date });
  return ApiResponse.created({ id }, 'Hora extra creada exitosamente');
});
