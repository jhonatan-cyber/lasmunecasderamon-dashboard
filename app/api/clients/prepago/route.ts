import { NextResponse } from 'next/server';
import { ClientService } from '@/lib/services/ClientService';
import { withRoute } from '@/lib/api/withRoute';
import { ApiResponse } from '@/lib/api/api-response';

export const POST = withRoute(
  { auth: true, audit: true, module: 'clients', action: 'write' },
  async (request, { user }) => {
    const body = await request.json();
    const { cliente_id, monto, tipo, metodo_pago, pagos_mixtos, metadatos } = body;

    if (!cliente_id || !monto || tipo !== 'CARGA') {
      return ApiResponse.error(new Error('Datos de recarga inválidos'));
    }

    try {
      await ClientService.addPrepago({
        cliente_id,
        monto,
        tipo,
        metodo_pago,
        pagos_mixtos,
        usuario_id: user.id,
        metadatos
      });

      return NextResponse.json({
        success: true,
        message: 'Saldo cargado correctamente'
      });
    } catch (error: unknown) {
      return ApiResponse.error(error);
    }
  }
);
