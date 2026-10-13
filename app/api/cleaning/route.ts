import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { runIdempotent } from '@/lib/api/idempotency';
import { OperacionLimpiezaSchema } from '@/lib/business/limpieza';
import { listarLimpieza, operarLimpieza } from '@/modules/inventario';
import { AppError } from '@/lib/errors/errors';
import { ApiResponse } from '@/lib/api/api-response';

export const GET = withRoute({ auth: true, access: 'authenticated' }, async (_request, { user }) =>
  NextResponse.json({
    success: true,
    data: await listarLimpieza({ id: String(user.id), role: user.role })
  })
);
export const POST = withRoute(
  { auth: true, access: 'authenticated', audit: true },
  async (request, { user }) => {
    const op = OperacionLimpiezaSchema.parse(await request.json());
    return runIdempotent(
      request,
      { endpoint: 'cleaning.operation', usuarioId: String(user.id) },
      async () => {
        try {
          const data = await operarLimpieza(op, { id: String(user.id), role: user.role });
          return NextResponse.json({ success: true, data });
        } catch (error) {
          if (error instanceof AppError) return ApiResponse.error(error);
          throw error;
        }
      }
    );
  }
);
