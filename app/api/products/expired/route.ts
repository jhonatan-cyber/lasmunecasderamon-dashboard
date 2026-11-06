import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { darDeBajaVencidos, listarVencidos, listarVencidosRetirados } from '@/modules/inventario';

/** Lotes vencidos: qué presentations tienen stock que ya no se puede vender. */
export const GET = withRoute(
  { auth: true, module: 'products', action: 'read' },
  async (request: Request) => {
    const { searchParams } = new URL(request.url);
    const origen = searchParams.get('origen');
    const data =
      searchParams.get('historial') === '1'
        ? await listarVencidosRetirados(
            origen === 'almacen' || origen === 'bar' ? origen : undefined
          )
        : await listarVencidos();
    return NextResponse.json({ success: true, data });
  }
);

/**
 * Da de baja el stock vencido de una presentación. Las unidades salen del
 * inventario y quedan registradas como merma en el historial.
 */
export const POST = withRoute(
  { auth: true, audit: true, module: 'products', action: 'write' },
  async (request: Request, { user }) => {
    const payload = await request.json();
    const presentacionId = String(payload?.presentacion_id ?? '').trim();
    if (!presentacionId) {
      return NextResponse.json(
        { success: false, message: 'presentacion_id es requerido' },
        { status: 400 }
      );
    }
    const data = await darDeBajaVencidos(
      presentacionId,
      String(user.id),
      payload?.nota ? String(payload.nota) : null,
      payload?.origen === 'almacen' || payload?.origen === 'bar' ? payload.origen : 'ambos'
    );
    return NextResponse.json({
      success: true,
      message: `${data.unidades} botella(s) vencida(s) dadas de baja de "${data.presentacion}"`,
      data
    });
  }
);
