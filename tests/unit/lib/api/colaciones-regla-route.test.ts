// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/withRoute', () => ({
  withRoute: (_config: unknown, handler: unknown) => handler
}));

import { GET } from '@/app/api/meals/rule/route';
import { PRODUCTS_FOR_SALE_ENDPOINT } from '@/lib/constants/api-endpoints';

const call = () =>
  (
    GET as unknown as (
      request: Request,
      context: { params: Record<string, never> }
    ) => Promise<Response>
  )(new Request('http://localhost/api/meals/rule'), { params: {} });

describe('GET /api/meals/rule', () => {
  it('entrega roles, catálogos y categoría desde el helper compartido', async () => {
    const response = await call();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual({
      success: true,
      data: {
        endpointCatalogo: PRODUCTS_FOR_SALE_ENDPOINT,
        categoriaBebidasAnalcoholicas: 'bebidas_analcoholicas',
        catalogos: {
          productos: { parametroCatalogo: 'solo_colaciones', categoriaSistema: null },
          analcoholicas: {
            parametroCatalogo: 'solo_colaciones_analcoholicas',
            categoriaSistema: 'bebidas_analcoholicas'
          }
        },
        roles: {
          anfitriona: {
            catalogo: 'productos',
            parametroCatalogo: 'solo_colaciones',
            categoriaSistema: null
          },
          cajero: {
            catalogo: 'analcoholicas',
            parametroCatalogo: 'solo_colaciones_analcoholicas',
            categoriaSistema: 'bebidas_analcoholicas'
          },
          garzon: {
            catalogo: 'analcoholicas',
            parametroCatalogo: 'solo_colaciones_analcoholicas',
            categoriaSistema: 'bebidas_analcoholicas'
          },
          barman: {
            catalogo: 'analcoholicas',
            parametroCatalogo: 'solo_colaciones_analcoholicas',
            categoriaSistema: 'bebidas_analcoholicas'
          }
        }
      }
    });
  });
});
