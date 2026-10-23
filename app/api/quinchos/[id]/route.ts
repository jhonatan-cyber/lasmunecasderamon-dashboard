import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { ApiResponse } from '@/lib/api/api-response';
import { anularReservaQuincho } from '@/workflows/reservas-quincho';

export const DELETE = withRoute(
  { auth: true, audit: true, module: 'quinchos', action: 'delete' },
  async (_request, { params, user }) => {
    const { id } = await params;
    try {
      const data = await anularReservaQuincho(id, user.id);
      return NextResponse.json({
        success: true,
        message: `Reserva anulada: ${data.total.toLocaleString('es-CL')} devueltos del prepago del cliente.`,
        data
      });
    } catch (error) {
      return ApiResponse.error(error);
    }
  }
);
