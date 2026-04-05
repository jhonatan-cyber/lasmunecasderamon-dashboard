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
    `SELECT sas.id, sas.token, sas.estado,
            s.id_servicio, s.codigo, s.total,
            COALESCE(c.nombre, 'Sin cliente registrado') as cliente_nombre
     FROM solicitudes_anulacion_servicios sas
     INNER JOIN servicios s ON s.id_servicio = sas.servicio_id
     LEFT JOIN clientes c ON c.id_cliente = s.cliente_id
     WHERE BINARY sas.token = BINARY ? AND sas.estado = 'pendiente'
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
  const adminWhatsApp =
    process.env.ADMIN_WHATSAPP_NUMBER?.replace('whatsapp:', '') || '59172419112';

  await processPendingSolicitud(
    {
      tipo: 'servicio',
      id_servicio: solicitud.id_servicio,
      codigo: solicitud.codigo,
      cliente_nombre: solicitud.cliente_nombre,
      total: Number(solicitud.total || 0),
    },
    action,
    adminWhatsApp
  );

  await query('UPDATE solicitudes_anulacion_servicios SET estado = ? WHERE id = ?', [
    action === 'confirmar' ? 'confirmada' : 'rechazada',
    solicitud.id,
  ]);

  return NextResponse.json({ success: true });
}
