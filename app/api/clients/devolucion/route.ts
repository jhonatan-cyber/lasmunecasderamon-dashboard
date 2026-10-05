import { NextResponse } from 'next/server';
import { ClientService } from '@/lib/services/ClientService';
import { withRoute } from '@/lib/api/withRoute';
import { ApiResponse } from '@/lib/api/api-response';

export const POST = withRoute(
  { auth: true, audit: true, module: 'clients', action: 'write' },
  async (request, { user }) => {
    const body = await request.json();
    const { cliente_id, monto, motivo } = body;

    const montoNum = Number(monto);

    if (!cliente_id || !montoNum || montoNum <= 0) {
      return ApiResponse.error(
        new Error('Datos de devolucion invalidos: cliente y monto requerido')
      );
    }

    // Devolucion siempre por transferencia, no afecta caja
    const metodo = 'transferencia';

    try {
      await ClientService.devolverSaldo({
        cliente_id,
        monto: montoNum,
        metodo_pago: metodo,
        motivo: motivo || 'Devolucion de saldo',
        usuario_id: user.id
      });

      return NextResponse.json({
        success: true,
        message: 'Devolucion realizada correctamente'
      });
    } catch (error: unknown) {
      return ApiResponse.error(error);
    }
  }
);
