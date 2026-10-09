import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { listarCompras, registrarCompra } from '@/modules/inventario';

export const GET = withRoute({ auth: true, module: 'products', action: 'read' }, async () => {
  const data = await listarCompras();
  return NextResponse.json({ success: true, data });
});

export const POST = withRoute(
  { auth: true, audit: true, module: 'products', action: 'write' },
  async (request: Request, context: any) => {
    const payload = await request.json();
    const data = await registrarCompra(
      {
        detalles: payload.detalles ?? [],
        proveedor: payload.proveedor ?? null,
        telefono: payload.telefono ?? null,
        observaciones: payload.observaciones ?? null,
        metodo_pago: payload.metodo_pago ?? 'efectivo'
      },
      context?.user?.id ?? null
    );
    return NextResponse.json(
      {
        success: true,
        message: `Compra ${data.folio} registrada: ${data.codigos_generados.length} códigos generados para imprimir.`,
        data
      },
      { status: 201 }
    );
  }
);
