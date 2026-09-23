import { NextResponse } from 'next/server';
import { withPublicRoute, withRoute } from '@/lib/api/withRoute';
import { ProductService } from '@/lib/services/ProductService';

export const GET = withPublicRoute(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const productoId = searchParams.get('producto_id');

  if (!productoId) {
    return NextResponse.json(
      { success: false, message: 'producto_id es requerido' },
      { status: 400 }
    );
  }

  const data = await ProductService.listUnits(
    productoId,
    searchParams.get('presentacion_id') || undefined
  );
  return NextResponse.json({ success: true, data });
});

export const POST = withRoute(
  { auth: true, audit: true, module: 'products', action: 'write' },
  async (request: Request) => {
    const payload = await request.json();

    if (!payload.producto_id || !payload.presentacion_id || payload.cantidad === undefined) {
      return NextResponse.json(
        { success: false, message: 'producto_id, presentacion_id y cantidad son requeridos' },
        { status: 400 }
      );
    }

    const data = await ProductService.addUnits(
      payload.producto_id,
      payload.presentacion_id,
      payload.cantidad
    );
    return NextResponse.json(
      { success: true, message: `${data.length} códigos generados correctamente`, data },
      { status: 201 }
    );
  }
);

export const PATCH = withRoute(
  { auth: true, audit: true, module: 'products', action: 'write' },
  async (request: Request) => {
    const payload = await request.json();

    if (!payload.producto_id || !payload.ids || !payload.estado) {
      return NextResponse.json(
        { success: false, message: 'producto_id, ids y estado son requeridos' },
        { status: 400 }
      );
    }

    const total = await ProductService.setUnitsEstado(
      payload.producto_id,
      payload.ids,
      payload.estado
    );
    return NextResponse.json({
      success: true,
      message: 'Códigos actualizados correctamente',
      data: { total }
    });
  }
);
