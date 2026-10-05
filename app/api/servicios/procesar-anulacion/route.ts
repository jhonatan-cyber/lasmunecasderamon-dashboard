import { NextResponse } from 'next/server';
import { obtenerSolicitudAnulacionServicioPorToken } from '@/modules/operacion';
import { processPendingSolicitud } from '@/lib/integrations/whatsappPendingActions';

export async function POST(request: Request) {
  const body = await request.json();
  const token = body?.token;
  const action = body?.action as 'confirmar' | 'rechazar';

  if (!token || !['confirmar', 'rechazar'].includes(action)) {
    return NextResponse.json({ success: false, message: 'Solicitud invalida' }, { status: 400 });
  }

  const [solicitud] = await obtenerSolicitudAnulacionServicioPorToken(token);

  if (!solicitud) {
    return NextResponse.json(
      { success: false, message: 'Solicitud no encontrada o ya procesada' },
      { status: 404 }
    );
  }

  await processPendingSolicitud(
    {
      tipo: 'servicio',
      solicitud_id: solicitud.id,
      id_servicio: solicitud.servicio_id,
      codigo: solicitud.codigo,
      cliente_nombre: solicitud.cliente_nombre,
      total: Number(solicitud.total || 0)
    },
    action
  );

  return NextResponse.json({ success: true });
}
