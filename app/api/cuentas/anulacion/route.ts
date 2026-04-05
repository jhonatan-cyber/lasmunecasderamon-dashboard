import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { CuentaRepository } from '@/lib/repositories/CuentaRepository';
import { getAuth } from '@/lib/auth/auth-app';
import { query } from '@/lib/database/db';
import { enviarMensajeSolicitudAnulacion } from '@/lib/integrations/whatsappService';

export const POST = withAppApiWrapper(async (request: Request) => {
  const user = await getAuth();
  if (!user) {
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });
  }

  const body = await request.json();
  const id = await CuentaRepository.requestAnulacion(
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

  const adminWhatsApp =
    process.env.ADMIN_WHATSAPP_NUMBER?.replace('whatsapp:', '') || '59172419112';
  const baseUrl = process.env.PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || '';
  await enviarMensajeSolicitudAnulacion({
    numeroAdmin: adminWhatsApp,
    tipo: 'cuenta',
    codigo: cuentaInfo[0]?.codigo || body.cuentaId,
    clienteNombre: cuentaInfo[0]?.cliente_nombre || body.clienteNombre || 'Sin cliente registrado',
    total: Number(cuentaInfo[0]?.total || 0),
    montoSolicitado: Number(body.monto || 0),
    motivo: body.motivo || 'Solicitud de anulacion de cuenta',
    solicitadoPor: user.nick || user.name || 'Usuario',
    token: id,
    baseUrl,
  });

  return NextResponse.json({ success: true, id, message: 'Solicitud de anulacion enviada' });
});
