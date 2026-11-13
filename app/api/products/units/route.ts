import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { ProductService } from '@/modules/inventario';

export const GET = withRoute(
  { auth: true, module: 'products', action: 'read' },
  async (request: Request) => {
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
  }
);

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

/** Baja manual de códigos desde el detalle de producto. */
export const DELETE = withRoute(
  { auth: true, audit: true, module: 'products', action: 'delete' },
  async (request: Request) => {
    const payload: unknown = await request.json().catch(() => null);
    const registro =
      typeof payload === 'object' && payload !== null
        ? (payload as { producto_id?: unknown; ids?: unknown })
        : null;
    const productoId = typeof registro?.producto_id === 'string' ? registro.producto_id.trim() : '';
    if (!productoId || !Array.isArray(registro?.ids) || registro.ids.length === 0) {
      return NextResponse.json(
        { success: false, message: 'producto_id e ids son requeridos' },
        { status: 400 }
      );
    }
    const total = await ProductService.deleteUnits(productoId, registro.ids);
    return NextResponse.json({
      success: true,
      message: total === 1 ? '1 código eliminado' : `${total} códigos eliminados`,
      data: { total }
    });
  }
);
