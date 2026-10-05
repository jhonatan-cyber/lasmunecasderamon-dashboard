import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { AccountService } from '@/lib/services/AccountService';
import { obtenerCuentaParaAnulacion } from '@/modules/operacion';
import { enviarMensajeSolicitudAnulacion } from '@/lib/integrations/whatsappService';
import logger from '@/lib/utils/logger';

export const POST = withRoute(
  { auth: true, audit: true, module: 'finances', action: 'write' },
  async (request: Request, { params, user }) => {
    const body = await request.json();

    const id = await AccountService.requestAnulacion(
      body.cuentaId,
      body.motivo || 'Solicitud de anulacion de cuenta',
      user.id.toString(),
      Number(body.monto || 0)
    );

    const cuentaInfo = await obtenerCuentaParaAnulacion(body.cuentaId);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';

    try {
      await enviarMensajeSolicitudAnulacion({
        tipo: 'cuenta',
        codigo: cuentaInfo?.codigo || body.cuentaId,
        clienteNombre: cuentaInfo?.cliente_nombre || body.clienteNombre || 'Sin cliente registrado',
        total: Number(cuentaInfo?.total || 0),
        montoSolicitado: Number(body.monto || 0),
        motivo: body.motivo || 'Solicitud de anulacion de cuenta',
        solicitadoPor: user.nick || user.name || 'Usuario',
        token: id,
        baseUrl
      });
    } catch (err) {
      logger.error('[AnulacionCuenta] Error enviando WhatsApp:', { err });
      return NextResponse.json(
        {
          success: false,
          message: 'Solicitud creada pero no se pudo enviar WhatsApp al administrador',
          id
        },
        { status: 202 }
      );
    }

    return NextResponse.json({ success: true, id, message: 'Solicitud de anulacion enviada' });
  }
);
