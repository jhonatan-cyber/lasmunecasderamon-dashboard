import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { obtenerCodigosCompra } from '@/modules/inventario';

export const GET = withRoute(
  { auth: true, module: 'products', action: 'read' },
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const data = await obtenerCodigosCompra(id);
    return NextResponse.json({ success: true, data });
  }
);
