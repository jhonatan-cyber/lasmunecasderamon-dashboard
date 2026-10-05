import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { ApiResponse } from '@/lib/api/api-response';
import { ClientService } from '@/lib/services/ClientService';
import { aprobarSolicitud, obtenerSolicitud, rechazarSolicitud } from '@/modules/clientes';

export const POST = withRoute(
  { auth: true, audit: true, module: 'clients', action: 'write' },
  async (request, { user }) => {
    const body = await request.json();
    const { solicitud_id, accion } = body; // accion: 'aprobar' | 'rechazar'

    if (!solicitud_id || !['aprobar', 'rechazar'].includes(String(accion))) {
      return ApiResponse.error(new Error('Datos invalidos'));
    }

    try {
      const sol = await obtenerSolicitud(String(solicitud_id));
      if (!sol) return ApiResponse.error(new Error('Solicitud no encontrada'));
      if (sol.estado !== 'pendiente')
        return ApiResponse.error(new Error(`Solicitud ya ${sol.estado}`));

      const adminId = String((user as any)?.id || (user as any)?.userId || '');

      if (String(accion) === 'rechazar') {
        await rechazarSolicitud(String(solicitud_id), adminId);
        return NextResponse.json({ success: true, message: 'Solicitud rechazada' });
      }

      // Aprobar: ejecutar devolucion real antes de marcar la solicitud, para que un
      // fallo en el pago la deje pendiente y se pueda reintentar.
      await ClientService.devolverSaldo({
        cliente_id: String(sol.cliente_id),
        monto: Number(sol.monto),
        metodo_pago: 'transferencia',
        motivo: sol.motivo || 'Aprobada por admin',
        usuario_id: adminId
      });

      await aprobarSolicitud(String(solicitud_id), adminId);

      return NextResponse.json({ success: true, message: 'Devolucion aprobada y ejecutada' });
    } catch (error: unknown) {
      return ApiResponse.error(error);
    }
  }
);
