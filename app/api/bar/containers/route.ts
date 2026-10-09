import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { ProductService } from '@/modules/inventario';

export const GET = withRoute({ auth: true, module: 'products', action: 'read' }, async () => {
  const data = await ProductService.listContainerReturns();
  return NextResponse.json({ success: true, data });
});

export const POST = withRoute(
  { auth: true, audit: true, module: 'products', action: 'return_container' },
  async (request: Request, context: { params: any; user: { id: string } }) => {
    const payload = await request.json().catch(() => null);
    const codigo = typeof payload?.codigo === 'string' ? payload.codigo.trim() : '';
    if (!codigo) {
      return NextResponse.json(
        { success: false, message: 'El código del envase es requerido' },
        { status: 400 }
      );
    }

    const resultado = await ProductService.verifyAndReturnContainer(
      codigo,
      context?.user?.id ?? null
    );
    return NextResponse.json({
      success: resultado.ok,
      message: resultado.mensaje,
      data: resultado
    });
  }
);
