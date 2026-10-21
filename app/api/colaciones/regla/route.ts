import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import {
  CATALOGOS_COLACION,
  CATEGORIA_BEBIDAS_ANALCOHOLICAS,
  reglasColacion
} from '@/lib/business/colacionRoles';
import { PRODUCTS_FOR_SALE_ENDPOINT } from '@/lib/constants/api-endpoints';

/**
 * Regla compartida de colación para clientes externos (app móvil): roles con
 * derecho a colación, catálogo que recibe cada uno y categoría protegida. Se
 * deriva del mismo helper que usan la UI y el servidor del dashboard.
 */
export const GET = withRoute({ auth: true, access: 'authenticated' }, async () =>
  NextResponse.json({
    success: true,
    data: {
      endpointCatalogo: PRODUCTS_FOR_SALE_ENDPOINT,
      categoriaBebidasAnalcoholicas: CATEGORIA_BEBIDAS_ANALCOHOLICAS,
      catalogos: CATALOGOS_COLACION,
      roles: reglasColacion()
    }
  })
);
