import { NextResponse } from 'next/server';
import { withPublicRoute, withRoute } from '@/lib/api/withRoute';
import { ServiceRequestService } from '@/modules/operacion';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { ValidationError } from '@/lib/errors/errors';
import { esBaucherDataUrlValido } from '@/lib/business/baucher';

export const GET = withPublicRoute(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const estado = searchParams.get('estado') || undefined;
  const data = await ServiceRequestService.getAll(estado);
  return NextResponse.json({ success: true, data });
});

export const POST = withRoute(
  { auth: true, audit: true, module: 'orders', action: 'write' },
  async (request: Request, { user }: { params: any; user: any }) => {
    const body = await request.json();
    const baucherFoto =
      typeof body.baucher_foto === 'string' && body.baucher_foto ? body.baucher_foto : undefined;
    // El baucher es la constancia del pago con transferencia: la app del garzón
    // lo adjunta desde la cámara y sin él la solicitud no se registra (igual que
    // el pedido y la entrada en la puerta). El camino directo del MCP no pasa
    // por acá y no adjunta fotos, por eso la exigencia vive en la ruta.
    if (body.metodo_pago === 'transferencia' && !baucherFoto)
      throw new ValidationError('El pago con transferencia necesita la foto del baucher');
    if (baucherFoto && !esBaucherDataUrlValido(baucherFoto))
      throw new ValidationError('La foto del baucher no es una imagen válida');
    const result = await ServiceRequestService.create(body, user.id.toString());

    sendNotificationToAll('new_service_request', {
      id: result.id,
      ...body,
      habitacion_nombre: result.habitacion_nombre,
      cliente_nombre: result.cliente_nombre
    });
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  }
);

export const DELETE = withRoute(
  { auth: true, audit: true, module: 'orders', action: 'delete' },
  async (request: Request) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) throw new ValidationError('ID requerido');

    await ServiceRequestService.delete(id);
    sendNotificationToAll('service_request_deleted', { id });
    return NextResponse.json({ success: true, message: 'Solicitud eliminada' });
  }
);
