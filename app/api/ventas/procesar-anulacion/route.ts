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
    `SELECT sav.id, sav.token, sav.estado, sav.monto,
            v.id_venta, v.codigo, v.total,
            COALESCE(CONCAT(c.nombre, ' ', c.apellido), 'Sin cliente registrado') as cliente_nombre
     FROM solicitudes_anulacion_ventas sav
     INNER JOIN ventas v ON v.id_venta = sav.venta_id
     LEFT JOIN clientes c ON c.id_cliente = v.cliente_id
     WHERE BINARY sav.token = BINARY ? AND sav.estado = 'pendiente'
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
      tipo: 'venta',
      solicitud_id: solicitud.id,
      id_venta: solicitud.id_venta,
      codigo: solicitud.codigo,
      cliente_nombre: solicitud.cliente_nombre,
      total: Number(solicitud.total || 0),
      monto: Number(solicitud.monto || 0)
    },
    action
  );

  return NextResponse.json({ success: true });
}
