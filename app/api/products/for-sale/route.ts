import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { CATALOGOS_COLACION } from '@/lib/business/colacionRoles';
import { ProductService } from '@/modules/inventario';

// Catálogo para ventas: solo presentaciones con stock en el bar.
export const GET = withPublicRoute(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const data = await ProductService.listForSale({
    category_id: searchParams.get('category_id') || undefined,
    term: searchParams.get('term') || undefined,
    solo_colaciones: searchParams.get(CATALOGOS_COLACION.productos.parametroCatalogo) === 'true',
    solo_cover: searchParams.get('solo_cover') === 'true',
    solo_colaciones_analcoholicas:
      searchParams.get(CATALOGOS_COLACION.analcoholicas.parametroCatalogo) === 'true'
  });
  return NextResponse.json({ success: true, data });
});
