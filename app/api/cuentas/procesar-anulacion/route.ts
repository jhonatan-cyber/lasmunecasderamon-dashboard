import { NextResponse } from 'next/server';
import { query } from '@/lib/database/db';
import { processPendingSolicitud } from '@/lib/integrations/whatsappPendingActions';

export async function POST(request: Request) {
  const body = await request.json();
  const token = body?.token;
  const action = body?.action as 'confirmar' | 'rechazar';

  if (!token || !['confirmar', 'rechazar'].includes(action)) {
    return NextResponse.json({ success: false, message: 'Solicitud invalida' }, { status: 400 });
  }

  const rows = await query<any[]>(
    `SELECT sac.id as solicitud_id, sac.cuenta_id as id_cuenta, sac.monto,
            c.codigo, c.total,
            COALESCE(cl.nombre, 'Sin cliente registrado') as cliente_nombre
     FROM solicitudes_anulacion_cuentas sac
     INNER JOIN cuentas c ON c.id_cuenta = sac.cuenta_id
     LEFT JOIN clientes cl ON cl.id_cliente = c.cliente_id
     WHERE sac.id = ? AND sac.estado = 'pendiente'
     LIMIT 1`,
    [token]
  );

  if (!rows.length) {
    return NextResponse.json(
      { success: false, message: 'Solicitud no encontrada o ya procesada' },
      { status: 404 }
    );
  }

  const solicitud = rows[0];

  await processPendingSolicitud(
    {
      tipo: 'cuenta',
      solicitud_id: solicitud.solicitud_id,
      id_cuenta: solicitud.id_cuenta,
      codigo: solicitud.codigo,
      cliente_nombre: solicitud.cliente_nombre,
      total: Number(solicitud.total || 0),
      monto: Number(solicitud.monto || 0),
    },
    action
  );

  return NextResponse.json({ success: true });
}
