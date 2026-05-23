import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { SaleRepository } from '@/lib/repositories/SaleRepository';
import { query } from '@/lib/database/db';
import { enviarMensajeSolicitudAnulacion } from '@/lib/integrations/whatsappService';
import { ValidationError } from '@/lib/errors/errors';
import logger from '@/lib/utils/logger';

export const POST = withAppAuth(async (request: Request, { user }: { params: any; user: any }) => {
  const body = await request.json();

  if (body.requestId) {
    await SaleRepository.processAnulacion(body.requestId, user.id.toString(), body.status);
    return NextResponse.json({ success: true, message: 'Solicitud procesada' });
  }

  const ventaInfo = await query<any[]>(
    `SELECT v.codigo, v.total,
            COALESCE(CONCAT(c.nombre, ' ', c.apellido), 'Sin cliente registrado') as cliente_nombre
     FROM ventas v
     LEFT JOIN clientes c ON v.cliente_id = c.id_cliente
     WHERE v.id_venta = ?
     LIMIT 1`,
    [body.ventaId]
  );

  const totalVenta = Number(ventaInfo[0]?.total || 0);
  const montoSolicitado = Number(body.monto || 0);

  const existingRequest = await query<any[]>(
    `SELECT id
     FROM solicitudes_anulacion_ventas
     WHERE venta_id = ?
     LIMIT 1`,
    [body.ventaId]
  );

  if (!body.motivo || !String(body.motivo).trim())
    throw new ValidationError('Debes ingresar el motivo de la anulacion');

  if (existingRequest.length > 0)
    throw new ValidationError('Esta venta ya tiene una solicitud de anulacion registrada');

  if (!Number.isFinite(montoSolicitado) || montoSolicitado <= 0)
    throw new ValidationError('Debes ingresar un monto mayor a 0', { monto: montoSolicitado });

  if (montoSolicitado > totalVenta)
    throw new ValidationError('El monto no puede ser mayor al total de la venta', {
      montoSolicitado,
      totalVenta
    });

  const token = await SaleRepository.requestAnulacion(
    body.ventaId,
    body.motivo,
    user.nick || user.name || user.id.toString(),
    montoSolicitado
  );

  const adminWhatsApp =
    process.env.ADMIN_WHATSAPP_NUMBER?.replace('whatsapp:', '') || '59172419112';
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.PUBLIC_BASE_URL ||
    'https://dev.lasmuñecasderamon.com';

  console.log('[Anulacion] baseUrl configurada:', baseUrl);

  try {
    await enviarMensajeSolicitudAnulacion({
      numeroAdmin: adminWhatsApp,
      tipo: 'venta',
      codigo: ventaInfo[0]?.codigo || body.ventaId,
      clienteNombre: ventaInfo[0]?.cliente_nombre || 'Sin cliente registrado',
      total: Number(ventaInfo[0]?.total || 0),
      motivo: body.motivo,
      montoSolicitado,
      solicitadoPor: user.nick || user.name || 'Usuario',
      token,
      baseUrl
    });
  } catch (err) {
    logger.error('[AnulacionVenta] Error enviando WhatsApp:', { err });
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
});
