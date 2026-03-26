import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { SaleRepository } from '@/lib/repositories/SaleRepository';
import { getAuth } from '@/lib/auth/auth-app';

export const GET = withAppApiWrapper(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    const data = await SaleRepository.getById(id);
    if (!data)
      return NextResponse.json({ success: false, message: 'Venta no encontrada' }, { status: 404 });
    return NextResponse.json({ success: true, data });
  }
);

export const PATCH = withAppApiWrapper(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    const user = await getAuth();
    const { estado } = await request.json();
    await SaleRepository.updateStatus(id, estado, user?.id.toString());
    return NextResponse.json({ success: true, message: 'Estado actualizado' });
  }
);

export const DELETE = withAppApiWrapper(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    await SaleRepository.delete(id);
    return NextResponse.json({ success: true, message: 'Venta eliminada exitosamente' });
  }
);
