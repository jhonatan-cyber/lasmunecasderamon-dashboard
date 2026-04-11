import { NextResponse } from 'next/server';
import { withAppApiWrapper, withAppAuth } from '@/lib/api/app-api-wrapper';
import { SaleRepository } from '@/lib/repositories/SaleRepository';

export const GET = withAppApiWrapper(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    const data = await SaleRepository.getById(id);
    if (!data)
      return NextResponse.json({ success: false, message: 'Venta no encontrada' }, { status: 404 });
    return NextResponse.json({ success: true, data });
  }
);

export const PATCH = withAppAuth(
  async (request: Request, { params, user }: { params: Promise<{ id: string }>; user: any }) => {
    const id = (await params).id;
    const { estado } = await request.json();
    await SaleRepository.updateStatus(id, estado, user.id.toString());
    return NextResponse.json({ success: true, message: 'Estado actualizado' });
  }
);

export const DELETE = withAppAuth(
  async () => {
    return NextResponse.json(
      {
        success: false,
        message: 'La eliminacion fisica de ventas esta deshabilitada. Use el flujo de anulacion.'
      },
      { status: 409 }
    );
  },
  { requiredPermission: { module: 'sales', action: 'delete' } }
);
