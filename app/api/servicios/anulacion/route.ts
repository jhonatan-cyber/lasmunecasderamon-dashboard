import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { ServiceRepository } from '@/lib/repositories/ServiceRepository';
import { getAuth } from '@/lib/auth/auth-app';
import { query } from '@/lib/database/db';
import { enviarMensajeSolicitudAnulacion } from '@/lib/integrations/whatsappService';

export const POST = withAppApiWrapper(async (request: Request) => {
  const user = await getAuth();
  if (!user)
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

  const body = await request.json();
  if (body.requestId) {
    // Process
    await ServiceRepository.processAnulacion(body.requestId, user.id.toString(), body.status);
    return NextResponse.json({ success: true, message: 'Solicitud procesada' });
  } else {
    // Request
    const token = await ServiceRepository.requestAnulacion(
      body.servicioId,
      body.motivo,
      user.nick || user.name || user.id.toString()
    );
    const servicioInfo = await query<any[]>(
      `SELECT s.codigo, s.total, s.tiempo, h.nombre as habitacion_nombre,
              COALESCE(c.nombre, 'Sin cliente registrado') as cliente_nombre
       FROM servicios s
       LEFT JOIN clientes c ON s.cliente_id = c.id_cliente
       LEFT JOIN habitaciones h ON s.habitacion_id = h.id_habitacion
       WHERE s.id_servicio = ?
       LIMIT 1`,
      [body.servicioId]
    );

    const adminWhatsApp =
      process.env.ADMIN_WHATSAPP_NUMBER?.replace('whatsapp:', '') || '59172419112';
    const baseUrl = process.env.PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || '';
    await enviarMensajeSolicitudAnulacion({
      numeroAdmin: adminWhatsApp,
      tipo: 'servicio',
      codigo: servicioInfo[0]?.codigo || body.servicioId,
      clienteNombre: servicioInfo[0]?.cliente_nombre || 'Sin cliente registrado',
      total: Number(servicioInfo[0]?.total || 0),
      motivo: body.motivo || 'Solicitud de anulacion de servicio',
      solicitadoPor: user.nick || user.name || 'Usuario',
      habitacion: servicioInfo[0]?.habitacion_nombre || null,
      tiempo: Number(servicioInfo[0]?.tiempo || 0),
      token,
      baseUrl,
    });

    return NextResponse.json({ success: true, token });
  }
});
