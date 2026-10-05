import { NextResponse } from 'next/server';
import { withPublicRoute, withRoute } from '@/lib/api/withRoute';
import { ProductService } from '@/modules/inventario';

export const GET = withPublicRoute(async (request: Request) => {
  const productoId = new URL(request.url).searchParams.get('producto_id') || undefined;
  const data = await ProductService.listBarStock(productoId);
  return NextResponse.json({ success: true, data });
});

export const POST = withRoute(
  { auth: true, audit: true, module: 'products', action: 'write' },
  async (request: Request, context: any) => {
    const payload = await request.json();

    if (!payload.producto_id || !payload.presentacion_id || payload.cantidad === undefined) {
      return NextResponse.json(
        {
          success: false,
          message: 'producto_id, presentacion_id y cantidad son requeridos'
        },
        { status: 400 }
      );
    }

    const data = await ProductService.traspasarAlBar(
      payload.producto_id,
      payload.presentacion_id,
      payload.cantidad,
      payload.precio_venta,
      payload.comision,
      context?.user?.id ?? null,
      payload.opciones_venta
    );
    return NextResponse.json(
      {
        success: true,
        message: `${data.trasladadas} unidad(es) enviadas. Pendiente de aceptación del Barman.`,
        data
      },
      { status: 201 }
    );
  }
);
