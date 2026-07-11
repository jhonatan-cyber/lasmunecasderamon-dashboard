import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { OrderService } from '@/lib/services/OrderService';
import { ValidationError } from '@/lib/errors/errors';

export const DELETE = withAppAuth(
  async (_request: Request, { params }: { params: Promise<{ id: string }>; user: any }) => {
    const id = (await params).id;
    await OrderService.delete(id);
    return NextResponse.json({ success: true, message: 'Pedido eliminado correctamente' });
  }
);

export const PUT = withAppAuth(
  async (request: Request, { params }: { params: Promise<{ id: string }>; user: any }) => {
    const id = (await params).id;
    const { estado } = await request.json();

    if (estado === undefined) throw new ValidationError('estado es requerido', { estado });

    await OrderService.updateStatus(id, estado);
    return NextResponse.json({
      success: true,
      message: 'Estado del pedido actualizado correctamente'
    });
  }
);
