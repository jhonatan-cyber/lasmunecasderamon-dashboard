import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { ServiceService } from '@/modules/operacion';
import { sendNotificationToAll } from '@/lib/api/sseService';

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(item => String(item ?? '').trim()).filter(Boolean);
}

export const POST = withRoute(
  { auth: true, access: 'authenticated', audit: true },
  async (request: Request, { user }) => {
    const body = await request.json();

    const payload = {
      ...body,
      cliente_id: body?.cliente_id == null ? null : String(body.cliente_id),
      habitacion_id: String(body?.habitacion_id ?? ''),
      usuarios: toStringArray(body?.usuarios),
      clientes: toStringArray(body?.clientes)
    };

    const result = await ServiceService.createService(payload, user.id.toString());
    sendNotificationToAll('service_changed', {
      action: 'create-temporary',
      id: result.id,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      data: {
        id_servicio: result.id,
        codigo: result.codigo,
        tiempo: result.tiempo,
        total: result.total
      }
    });
  }
);
