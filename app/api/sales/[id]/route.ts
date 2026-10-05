import { NextResponse } from 'next/server';
import { withPublicRoute, withRoute } from '@/lib/api/withRoute';
import { SaleService } from '@/lib/services/SaleService';

export const GET = withPublicRoute(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    const data = await SaleService.getById(id);
    if (!data)
      return NextResponse.json({ success: false, message: 'Venta no encontrada' }, { status: 404 });
    return NextResponse.json({ success: true, data });
  }
);

export const PATCH = withRoute(
  { auth: true, audit: true, module: 'sales', action: 'write' },
  async (request: Request, { params, user }: { params: Promise<{ id: string }>; user: any }) => {
    const id = (await params).id;
    const body = await request.json();

    if (body.action === 'stop') {
      await SaleService.updateStatus(id, 1, user.id.toString());
      return NextResponse.json({ success: true, message: 'Venta finalizada' });
    }

    const { estado } = body;
    await SaleService.updateStatus(id, estado, user.id.toString());
    return NextResponse.json({ success: true, message: 'Estado actualizado' });
  }
);

export const DELETE = withRoute(
  { auth: true, audit: true, module: 'sales', action: 'delete' },
  async () => {
    return NextResponse.json(
      {
        success: false,
        message: 'La eliminacion fisica de ventas esta deshabilitada. Use el flujo de anulacion.'
      },
      { status: 409 }
    );
  }
);
