import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { query } from '@/lib/database/db';

export const GET = withRoute(
  { auth: true, audit: false, module: 'clients', action: 'view' },
  async () => {
    try {
      const rows = await query<any[]>(
        `SELECT s.id, s.cliente_id, s.monto, s.motivo, s.estado, s.fecha_crea, s.fecha_resolucion,
                c.nombre, c.apellido, c.run, c.telefono, c.saldo as saldo_actual,
                u_solic.nick as solicitado_por_nick, u_res.nick as resuelto_por_nick
         FROM solicitudes_devolucion_saldo s
         LEFT JOIN clientes c ON c.id_cliente = s.cliente_id
         LEFT JOIN usuarios u_solic ON u_solic.id_usuario = s.solicitado_por
         LEFT JOIN usuarios u_res ON u_res.id_usuario = s.resuelto_por
         ORDER BY 
           CASE WHEN s.estado='pendiente' THEN 0 ELSE 1 END,
           s.fecha_crea DESC
         LIMIT 50`
      );
      return NextResponse.json({ success: true, data: rows });
    } catch (error: any) {
      // Si tabla no existe aun, devolver vacio
      if (String(error?.message || '').includes('does not exist') || String(error?.code) === '42P01') {
        return NextResponse.json({ success: true, data: [] });
      }
      throw error;
    }
  }
);
