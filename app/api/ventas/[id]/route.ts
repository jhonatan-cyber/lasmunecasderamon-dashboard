import { NextResponse } from 'next/server';
import { SaleRepository } from '@/lib/repositories/SaleRepository';
import { getAuth } from '@/lib/auth-app';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    const data = await SaleRepository.getById(id);
    if (!data) return NextResponse.json({ success: false, message: 'Venta no encontrada' }, { status: 404 });
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error getting sale', error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    const user = await getAuth();
    const { estado } = await request.json();
    await SaleRepository.updateStatus(id, estado, user?.id.toString());
    return NextResponse.json({ success: true, message: 'Estado actualizado' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Error updating status' }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    await SaleRepository.delete(id);
    return NextResponse.json({ success: true, message: 'Venta eliminada exitosamente' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error deleting sale', error: error.message }, { status: 500 });
  }
}
