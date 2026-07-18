import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { OrderService } from '@/lib/services/OrderService';
import { ValidationError } from '@/lib/errors/errors';

export const DELETE = withRoute({ auth: true, audit: true, module: 'orders', action: 'delete' },
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    await OrderService.delete(id);
    return NextResponse.json({ success: true, message: 'Pedido eliminado correctamente' });
  }
);

export const PUT = withRoute({ auth: true, audit: true, module: 'orders', action: 'write' },
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
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
