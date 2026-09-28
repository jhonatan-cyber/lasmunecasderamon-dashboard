import { NextResponse } from 'next/server';
import { withPublicRoute, withRoute } from '@/lib/api/withRoute';
import { runIdempotent } from '@/lib/api/idempotency';
import { OrderService } from '@/lib/services/OrderService';
import { OrderCreateSchema } from '@/lib/business/schemas/order';
import { validateOrResponse } from '@/lib/api/validate';

export const GET = withPublicRoute(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit') ?? 200), 500);
  const orders = await OrderService.getAll(limit);
  return NextResponse.json({ success: true, data: orders });
});

/**
 * El garzón puede crear el pedido sin red: la app lo encola y lo manda al
 * reconectar, con su id de intención como `x-idempotency-key`. El reintento
 * replica la respuesta original en vez de crear un pedido duplicado.
 */
export const POST = withRoute(
  { auth: true, audit: true, module: 'orders', action: 'write' },
  async (request: Request, { user }) =>
    runIdempotent(request, { endpoint: 'orders.create', usuarioId: user?.id ?? null }, async () => {
      const body = await request.json();
      const validated = validateOrResponse(OrderCreateSchema, body);
      if (validated instanceof NextResponse) return validated;
      const result = await OrderService.create(validated);
      return NextResponse.json(
        { success: true, message: 'Pedido creado correctamente', ...result },
        { status: 201 }
      );
    })
);
