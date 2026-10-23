import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { ApiResponse } from '@/lib/api/api-response';
import { listarReservas } from '@/modules/quinchos';
import { reservarQuincho } from '@/workflows/reservas-quincho';
import { formatCurrencyCLP } from '@/lib/utils/formatters';

export const GET = withRoute({ auth: true, module: 'quinchos', action: 'read' }, async () => {
  const data = await listarReservas();
  return NextResponse.json({ success: true, data });
});

export const POST = withRoute(
  { auth: true, audit: true, module: 'quinchos', action: 'write' },
  async (request, { user }) => {
    try {
      const body = await request.json();
      const data = await reservarQuincho(body, user.id);
      return NextResponse.json(
        {
          success: true,
          message: `Reserva del ${data.fecha_reserva} registrada: ${formatCurrencyCLP(
            data.total
          )} abonados al prepago de ${data.cliente_nombre} ${data.cliente_apellido}.`,
          data
        },
        { status: 201 }
      );
    } catch (error) {
      return ApiResponse.error(error);
    }
  }
);
