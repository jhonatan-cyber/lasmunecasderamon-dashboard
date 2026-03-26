import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { OrderRepository } from '@/lib/repositories/OrderRepository';
import { getAuth } from '@/lib/auth/auth-app';

export const DELETE = withAppApiWrapper(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const user = await getAuth();
    if (!user)
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

    const id = (await params).id;
    if (!id) return NextResponse.json({ success: false, message: 'Falta el id' }, { status: 400 });

    await OrderRepository.delete(id);
    return NextResponse.json({ success: true, message: 'Pedido eliminado correctamente' });
  }
);

export const PUT = withAppApiWrapper(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const user = await getAuth();
    if (!user)
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

    const id = (await params).id;
    const { estado } = await request.json();

    if (!id || estado === undefined) {
      return NextResponse.json(
        { success: false, message: 'Falta el id o el estado' },
        { status: 400 }
      );
    }

    await OrderRepository.updateStatus(id, estado);
    return NextResponse.json({
      success: true,
      message: 'Estado del pedido actualizado correctamente'
    });
  }
);
