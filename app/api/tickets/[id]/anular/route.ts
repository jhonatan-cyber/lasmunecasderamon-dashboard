import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { ApiResponse } from '@/lib/api/api-response';
import { anularEntrada } from '@/modules/entradas';
import { AppError, ValidationError } from '@/lib/errors/errors';

/**
 * Anula una entrada que nunca se sirvió (el cliente se fue).
 *
 * El dinero se cobró en la puerta: se postea como entrada a la caja y la fila
 * queda cerrada sin tocar el stock.
 */
export const POST = withRoute(
  { auth: true, audit: true, module: 'entradas', action: 'deliver' },
  async (_request, { params, user }) => {
    const id = (await params).id;
    if (!id) throw new ValidationError('Indica la entrada a anular');
    try {
      const data = await anularEntrada({ entradaId: id, usuarioId: user.id });
      return NextResponse.json({ success: true, data });
    } catch (error) {
      if (error instanceof AppError) return ApiResponse.error(error);
      throw error;
    }
  }
);
