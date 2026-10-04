import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { listarHorasExtras, registrarHoraExtra } from '@/modules/personal';
import { ApiResponse } from '@/lib/api/api-response';
import { ValidationError } from '@/lib/errors/errors';

// GET: el handler ya limita a datos propios salvo para el administrador.
export const GET = withRoute(
  { auth: true, access: 'authenticated', audit: true },
  async (request: Request, { user }: { params: any; user: any }) => {
    const { searchParams } = new URL(request.url);
    const userIdInQuery = searchParams.get('userId');
    const isAdmin = user.role?.toLowerCase() === 'administrador';
    const targetUserId = isAdmin ? userIdInQuery || undefined : user.id;

    const data = await listarHorasExtras(targetUserId ? { usuarioId: targetUserId } : {});
    return ApiResponse.success(data);
  }
);

export const POST = withRoute(
  { auth: true, audit: true, module: 'overtime', action: 'write' },
  async (request: Request) => {
    const { usuario_id, hora, monto, device_date } = await request.json();
    if (!usuario_id || !hora || !monto)
      throw new ValidationError('usuario_id, hora y monto son requeridos', {
        usuario_id,
        hora,
        monto
      });

    const id = await registrarHoraExtra({ usuario_id, hora, monto, device_date });
    return ApiResponse.created({ id }, 'Hora extra creada exitosamente');
  }
);
