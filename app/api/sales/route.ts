import { NextResponse } from 'next/server';
import { withPublicRoute, withRoute } from '@/lib/api/withRoute';
import { runIdempotent } from '@/lib/api/idempotency';
import { SaleService } from '@/workflows/ventas';
import { SaleCreateSchema } from '@/lib/business/schemas/sale';
import { validateOrResponse } from '@/lib/api/validate';

export const GET = withPublicRoute(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const params = {
    tipo: searchParams.get('tipo') || undefined,
    page: searchParams.get('page') || '1',
    limit: searchParams.get('limit') || '10',
    estado: searchParams.get('estado') || undefined,
    caja_id: searchParams.get('caja_id') || undefined,
    search: searchParams.get('search') || undefined
  };
  const data = await SaleService.getAll(params);
  return NextResponse.json({ success: true, data });
});

/**
 * La venta puede registrarse sin red: el cajero la encola en el dispositivo y
 * la app la manda al reconectar, con el id de su intención como
 * `x-idempotency-key`. El reintento replica la respuesta original en vez de
 * cobrar dos veces.
 */
export const POST = withRoute(
  { auth: true, audit: true, module: 'sales', action: 'write' },
  async (request: Request, { user }: { params: any; user: any }) =>
    runIdempotent(request, { endpoint: 'sales.create', usuarioId: user?.id ?? null }, async () => {
      const body = await request.json();
      const validated = validateOrResponse(SaleCreateSchema, body);
      if (validated instanceof NextResponse) return validated;
      const result = await SaleService.createSale(validated, user.id.toString());
      return NextResponse.json(
        { success: true, message: 'Venta procesada', data: result },
        { status: 201 }
      );
    })
);
