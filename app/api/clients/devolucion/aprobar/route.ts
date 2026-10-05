import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { ApiResponse } from '@/lib/api/api-response';
import { ClientService } from '@/lib/services/ClientService';
import { query } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';

export const POST = withRoute(
  { auth: true, audit: true, module: 'clients', action: 'write' },
  async (request, { user }) => {
    const body = await request.json();
    const { solicitud_id, accion } = body; // accion: 'aprobar' | 'rechazar'

    if (!solicitud_id || !['aprobar', 'rechazar'].includes(String(accion))) {
      return ApiResponse.error(new Error('Datos invalidos'));
    }

    try {
      const rows = await query<any[]>(`SELECT * FROM solicitudes_devolucion_saldo WHERE id = ?`, [
        String(solicitud_id)
      ]);
      const sol = rows[0];
      if (!sol) return ApiResponse.error(new Error('Solicitud no encontrada'));
      if (sol.estado !== 'pendiente')
        return ApiResponse.error(new Error(`Solicitud ya ${sol.estado}`));

      const now = getNowInBusinessTimezone();
      const adminId = String((user as any)?.id || (user as any)?.userId || '');

      if (String(accion) === 'rechazar') {
        await query(
          `UPDATE solicitudes_devolucion_saldo SET estado='rechazada', fecha_resolucion=?, resuelto_por=? WHERE id=?`,
          [now, adminId, String(solicitud_id)]
        );
        return NextResponse.json({ success: true, message: 'Solicitud rechazada' });
      }

      // Aprobar: ejecutar devolucion real
      await ClientService.devolverSaldo({
        cliente_id: String(sol.cliente_id),
        monto: Number(sol.monto),
        metodo_pago: 'transferencia',
        motivo: sol.motivo || 'Aprobada por admin',
        usuario_id: adminId
      });

      await query(
        `UPDATE solicitudes_devolucion_saldo SET estado='aprobada', fecha_resolucion=?, resuelto_por=? WHERE id=?`,
        [now, adminId, String(solicitud_id)]
      );

      return NextResponse.json({ success: true, message: 'Devolucion aprobada y ejecutada' });
    } catch (error: unknown) {
      return ApiResponse.error(error);
    }
  }
);
