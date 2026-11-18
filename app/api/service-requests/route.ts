import { NextResponse } from 'next/server';
import { withPublicRoute, withRoute } from '@/lib/api/withRoute';
import { ServiceRequestService } from '@/modules/operacion';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { ValidationError } from '@/lib/errors/errors';
import { esBaucherDataUrlValido } from '@/lib/business/baucher';
import { AuthenticatedUser } from '@/lib/middleware/auth';

export const GET = withPublicRoute(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const estado = searchParams.get('estado') || undefined;
  const data = await ServiceRequestService.getAll(estado);
  return NextResponse.json({ success: true, data });
});

export const POST = withRoute(
  { auth: true, audit: true, module: 'orders', action: 'write' },
  async (request: Request, { user }: { params: unknown; user: AuthenticatedUser }) => {
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

    // El aviso viaja con la identidad de quien solicita: el modal que se abre
    // solo con este evento no consulta la base, así que si el nombre no viene
    // acá se muestra "N/A". También lleva `id_solicitud`, que es la clave con la
    // que el modal aprueba o rechaza.
    const solicitadoPorNombre = `${user.name ?? ''} ${user.lastName ?? ''}`.trim();
    sendNotificationToAll('new_service_request', {
      ...body,
      id: result.id,
      id_solicitud: result.id,
      solicitado_por: String(user.id),
      solicitado_por_nombre: solicitadoPorNombre || null,
      solicitado_por_nick: user.nick ?? null,
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
