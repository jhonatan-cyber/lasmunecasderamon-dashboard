import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { ProductService } from '@/modules/inventario';

export const POST = withRoute(
  { auth: true, audit: true, module: 'products', action: 'confirm_container_return' },
  async (request: Request, context: { params: any; user: { id: string } }) => {
    const payload = await request.json().catch(() => null);
    const codigo = typeof payload?.codigo === 'string' ? payload.codigo.trim() : '';
    if (!codigo) {
      return NextResponse.json(
        { success: false, message: 'El código del envase es requerido' },
        { status: 400 }
      );
    }

    const resultado = await ProductService.confirmContainerReturn(
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
