import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { SaleRepository } from '@/lib/repositories/SaleRepository';
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
    await SaleRepository.processAnulacion(body.requestId, user.id.toString(), body.status);
    return NextResponse.json({ success: true, message: 'Solicitud procesada' });
  } else {
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

    if (!body.motivo || !String(body.motivo).trim()) {
      return NextResponse.json(
        { success: false, message: 'Debes ingresar el motivo de la anulacion' },
        { status: 400 }
      );
    }

    if (!Number.isFinite(montoSolicitado) || montoSolicitado <= 0) {
      return NextResponse.json(
        { success: false, message: 'Debes ingresar un monto mayor a 0' },
        { status: 400 }
      );
    }

    if (montoSolicitado > totalVenta) {
      return NextResponse.json(
        { success: false, message: 'El monto no puede ser mayor al total de la venta' },
        { status: 400 }
      );
    }

    const token = await SaleRepository.requestAnulacion(
      body.ventaId,
      body.motivo,
      user.nick || user.name || user.id.toString(),
      montoSolicitado
    );

    const adminWhatsApp =
      process.env.ADMIN_WHATSAPP_NUMBER?.replace('whatsapp:', '') || '59172419112';
    const baseUrl = process.env.PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || '';
    await enviarMensajeSolicitudAnulacion({
      numeroAdmin: adminWhatsApp,
      tipo: 'venta',
      codigo: ventaInfo[0]?.codigo || body.ventaId,
      clienteNombre: ventaInfo[0]?.cliente_nombre || 'Sin cliente registrado',
      total: Number(ventaInfo[0]?.total || 0),
      motivo: body.motivo || 'Solicitud de anulacion de venta',
      montoSolicitado,
      solicitadoPor: user.nick || user.name || 'Usuario',
      token,
      baseUrl,
    });

    return NextResponse.json({ success: true, token });
  }
});
