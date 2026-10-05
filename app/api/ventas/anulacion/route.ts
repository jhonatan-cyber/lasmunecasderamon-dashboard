import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { SaleService } from '@/lib/services/SaleService';
import { existeSolicitudAnulacion, obtenerVentaParaAnulacion } from '@/modules/ventas';
import { enviarMensajeSolicitudAnulacion } from '@/lib/integrations/whatsappService';
import { ValidationError } from '@/lib/errors/errors';
import logger from '@/lib/utils/logger';

export const POST = withRoute(
  { auth: true, audit: true, module: 'sales', action: 'anulate' },
  async (request: Request, { user }: { params: any; user: any }) => {
    const body = await request.json();

    if (body.requestId) {
      await SaleService.processAnulacion(body.requestId, user.id.toString(), body.status);
      return NextResponse.json({ success: true, message: 'Solicitud procesada' });
    }

    const venta = await obtenerVentaParaAnulacion(body.ventaId);

    const totalVenta = Number(venta?.total || 0);
    const montoSolicitado = Number(body.monto || 0);

    const yaSolicitada = await existeSolicitudAnulacion(body.ventaId);

    if (!body.motivo || !String(body.motivo).trim())
      throw new ValidationError('Debes ingresar el motivo de la anulacion');

    if (yaSolicitada)
      throw new ValidationError('Esta venta ya tiene una solicitud de anulacion registrada');

    if (!Number.isFinite(montoSolicitado) || montoSolicitado <= 0)
      throw new ValidationError('Debes ingresar un monto mayor a 0', { monto: montoSolicitado });

    if (montoSolicitado > totalVenta)
      throw new ValidationError('El monto no puede ser mayor al total de la venta', {
        montoSolicitado,
        totalVenta
      });

    const token = await SaleService.requestAnulacion(
      body.ventaId,
      body.motivo,
      user.nick || user.name || user.id.toString(),
      montoSolicitado
    );

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';

    logger.info('[Anulacion] baseUrl configurada:', baseUrl);

    try {
      await enviarMensajeSolicitudAnulacion({
        tipo: 'venta',
        codigo: venta?.codigo || body.ventaId,
        clienteNombre: venta?.cliente_nombre || 'Sin cliente registrado',
        total: Number(venta?.total || 0),
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
  }
);
