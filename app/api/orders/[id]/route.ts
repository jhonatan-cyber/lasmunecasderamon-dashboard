import { NextResponse } from 'next/server';
import { OrderRepository } from '@/lib/repositories/OrderRepository';
import { getAuth } from '@/lib/auth-app';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuth();
    if (!user) return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

    const id = (await params).id;
    if (!id) return NextResponse.json({ success: false, message: 'Falta el id' }, { status: 400 });

    await OrderRepository.delete(id);
    return NextResponse.json({ success: true, message: 'Pedido eliminado correctamente' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error al eliminar pedido', error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuth();
    if (!user) return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

    const id = (await params).id;
    const { estado } = await request.json();

    if (!id || estado === undefined) {
      return NextResponse.json({ success: false, message: 'Falta el id o el estado' }, { status: 400 });
    }

    await OrderRepository.updateStatus(id, estado);
    return NextResponse.json({ success: true, message: 'Estado del pedido actualizado correctamente' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error al actualizar pedido', error: error.message }, { status: 500 });
  }
}
