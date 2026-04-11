import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { GratificacionRepository } from '@/lib/repositories/GratificacionRepository';
import { ValidationError } from '@/lib/errors/errors';

export const GET = withAppAuth(async (request: Request, { user }: { params: any; user: any }) => {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const isAdmin = user.role?.toLowerCase() === 'administrador';
  const targetUserId = isAdmin ? userId || undefined : user.id;

  const data = await GratificacionRepository.getAll(targetUserId);
  return NextResponse.json(data);
});

export const POST = withAppAuth(async (request: Request) => {
  const { usuario_id, monto, descripcion } = await request.json();
  if (!usuario_id || !monto)
    throw new ValidationError('usuario_id y monto son requeridos', { usuario_id, monto });

  const id = await GratificacionRepository.create({ usuario_id, monto, descripcion });
  return NextResponse.json({ success: true, message: 'Gratificación creada', id }, { status: 201 });
});
