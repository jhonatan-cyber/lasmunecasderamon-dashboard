import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { ServiceService } from '@/lib/services/ServiceService';
import { query } from '@/lib/database/db';
import { enviarMensajeSolicitudAnulacion } from '@/lib/integrations/whatsappService';
import logger from '@/lib/utils/logger';

export const POST = withRoute(
  { auth: true, access: 'authenticated', audit: true },
  async (request: Request, { user }: { params: any; user: any }) => {
    const body = await request.json();

    if (body.requestId) {
      await ServiceService.processAnulacion(body.requestId, user.id.toString(), body.status);
      return NextResponse.json({ success: true, message: 'Solicitud procesada' });
    }

    const token = await ServiceService.requestAnulacion(
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

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';

    try {
      await enviarMensajeSolicitudAnulacion({
        tipo: 'servicio',
        codigo: servicioInfo[0]?.codigo || body.servicioId,
        clienteNombre: servicioInfo[0]?.cliente_nombre || 'Sin cliente registrado',
        total: Number(servicioInfo[0]?.total || 0),
        motivo: body.motivo || 'Solicitud de anulacion de servicio',
        solicitadoPor: user.nick || user.name || 'Usuario',
        habitacion: servicioInfo[0]?.habitacion_nombre || null,
        tiempo: Number(servicioInfo[0]?.tiempo || 0),
        token,
        baseUrl
      });
    } catch (err) {
      logger.error('[AnulacionServicio] Error enviando WhatsApp:', { err });
      return NextResponse.json(
        {
          success: false,
          message: 'Solicitud creada pero no se pudo enviar WhatsApp al administrador',
          token
        },
        { status: 202 }
      );
    }

    return NextResponse.json({ success: true, token });
  }
);
