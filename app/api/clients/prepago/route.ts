import { NextResponse } from 'next/server';
import { ClientService } from '@/lib/services/ClientService';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { ApiResponse } from '@/lib/api/api-response';

export const POST = withAppAuth(
  async (request, { user }) => {
    const body = await request.json();
    const { cliente_id, monto, tipo, metodo_pago, metadatos } = body;

    if (!cliente_id || !monto || tipo !== 'CARGA') {
      return ApiResponse.error(new Error('Datos de recarga inválidos'));
    }

    try {
      await ClientService.addPrepago({
        cliente_id,
        monto,
        tipo,
        metodo_pago,
        usuario_id: user.id,
        metadatos
      });

      return NextResponse.json({ 
        success: true, 
        message: 'Saldo cargado correctamente' 
      });
    } catch (error: any) {
      return ApiResponse.error(error);
    }
  },
  { module: 'clients', action: 'write' }
);
