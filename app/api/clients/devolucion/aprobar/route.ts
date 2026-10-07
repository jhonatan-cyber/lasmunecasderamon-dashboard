import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { ApiResponse } from '@/lib/api/api-response';
import { obtenerSolicitud } from '@/modules/clientes';
import { resolverSolicitudDevolucion } from '@/workflows/prepago';

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

      await resolverSolicitudDevolucion(String(solicitud_id), accion, adminId, Number(sol.monto));
      return NextResponse.json({ success: true, message: accion === 'rechazar' ? 'Solicitud rechazada' : 'Devolucion aprobada y ejecutada' });
    } catch (error: unknown) {
      return ApiResponse.error(error);
    }
  }
);
