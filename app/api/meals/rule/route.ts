import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import {
  CATALOGOS_COLACION,
  CATEGORIA_BEBIDAS_ANALCOHOLICAS,
  reglasColacion
} from '@/lib/business/colacionRoles';
import { obtenerTopesColacionesPorRol } from '@/modules/colaciones';
import { PRODUCTS_FOR_SALE_ENDPOINT } from '@/lib/constants/api-endpoints';

/**
 * Regla compartida de colación para clientes externos (app móvil): roles con
 * derecho a colación, catálogo que recibe cada uno, categoría protegida y topes
 * configurados por turno. Se deriva de la configuración que usa el servidor.
 */
export const GET = withRoute({ auth: true, access: 'authenticated' }, async () => {
  const topesPorRol = await obtenerTopesColacionesPorRol();
  return NextResponse.json({
    success: true,
    data: {
      endpointCatalogo: PRODUCTS_FOR_SALE_ENDPOINT,
      categoriaBebidasAnalcoholicas: CATEGORIA_BEBIDAS_ANALCOHOLICAS,
      catalogos: CATALOGOS_COLACION,
      topesPorRol,
      roles: reglasColacion()
    }
  });
});
