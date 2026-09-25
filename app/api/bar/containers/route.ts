import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { ProductService } from '@/lib/services/ProductService';

/**
 * Control de envases vacíos bar → almacén.
 *
 * GET  -> historial de envases entregados por el bar, con la entrega y la
 *         recepción en almacén de cada uno. Lo ven las dos partes (lectura de
 *         productos), porque el almacén audita lo que el bar entregó.
 * POST -> verifica un código escaneado en el bar (es nuestro + vacío + sin
 *         entregar) y lo marca como entregado en el mismo paso. Un diagnóstico
 *         negativo no es un error HTTP: es el resultado del control y se
 *         devuelve en 200 con `success: false` para que el panel muestre el
 *         motivo. El segundo paso (confirmar la recepción) es
 *         ./confirm/route.ts.
 *
 * El POST exige el permiso products/return_container (migración 032: lo recibe
 * el barman; el administrador pasa siempre).
 */
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
