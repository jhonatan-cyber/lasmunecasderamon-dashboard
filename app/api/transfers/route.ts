import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { listarTransferencias } from '@/modules/inventario';
import { ProductService } from '@/lib/services/ProductService';

export { POST } from '@/app/api/bar/route';

export const GET = withRoute({ auth: true, module: 'products', action: 'read' }, async () => {
  const [items, history] = await Promise.all([
    ProductService.listBarStock(),
    listarTransferencias()
  ]);
  return NextResponse.json({ success: true, data: { items, history } });
});

export const PATCH = withRoute(
  { auth: true, audit: true, module: 'products', action: 'accept_transfer' },
  async (request: Request, context: any) => {
    const payload = await request.json();

    if (!payload.id || !payload.accion) {
      return NextResponse.json(
        { success: false, message: 'id y accion (aprobar o rechazar) son requeridos' },
        { status: 400 }
      );
    }

    const data = await ProductService.resolverTransferencia(
      payload.id,
      payload.accion,
      context?.user?.id ?? null
    );
    return NextResponse.json({
      success: true,
      message:
        data.estado === 'aceptada'
          ? 'Transferencia aprobada: stock disponible en el bar'
          : 'Transferencia rechazada: unidades devueltas al almacén',
      data
    });
  }
);
