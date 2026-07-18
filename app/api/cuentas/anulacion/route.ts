import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { AccountService } from '@/lib/services/AccountService';
import { query } from '@/lib/database/db';
import { enviarMensajeSolicitudAnulacion } from '@/lib/integrations/whatsappService';
import logger from '@/lib/utils/logger';

export const POST = withRoute({ auth: true, audit: true, module: 'finances', action: 'write' }, async (request: Request, { params, user }) => {
  const body = await request.json();

  const id = await AccountService.requestAnulacion(
    body.cuentaId,
    body.motivo || 'Solicitud de anulacion de cuenta',
    user.id.toString(),
    Number(body.monto || 0)
  );

  const cuentaInfo = await query<any[]>(
    `SELECT c.codigo, c.total,
            COALESCE(cl.nombre, 'Sin cliente registrado') as cliente_nombre
     FROM cuentas c
     LEFT JOIN clientes cl ON c.cliente_id = cl.id_cliente
     WHERE c.id_cuenta = ?
     LIMIT 1`,
    [body.cuentaId]
  );

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';

  try {
    await enviarMensajeSolicitudAnulacion({
      tipo: 'cuenta',
      codigo: cuentaInfo[0]?.codigo || body.cuentaId,
      clienteNombre:
        cuentaInfo[0]?.cliente_nombre || body.clienteNombre || 'Sin cliente registrado',
      total: Number(cuentaInfo[0]?.total || 0),
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
});
