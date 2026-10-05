import { NextResponse } from 'next/server';
import { withPublicRoute, withRoute } from '@/lib/api/withRoute';
import { ProductService } from '@/modules/inventario';

export const GET = withPublicRoute(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const data = await ProductService.getChampagneTiers(id);
    return NextResponse.json({ success: true, data });
  }
);

export const PUT = withRoute(
  { auth: true, audit: true, module: 'products', action: 'write' },
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const payload = await request.json();
    const data = await ProductService.saveChampagneTiers(id, payload.tiers ?? payload);
    return NextResponse.json({
      success: true,
      message: 'Tabla de precios actualizada correctamente',
      data
    });
  }
);
