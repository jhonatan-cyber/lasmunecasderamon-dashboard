/**
 * Endpoints de API compartidos entre páginas y helpers.
 *
 * `PRODUCTS_FOR_SALE_ENDPOINT` publica las presentaciones con stock en el bar;
 * lo consumen el catálogo de ventas (Entradas) y los catálogos de colación.
 */
export const PRODUCTS_FOR_SALE_ENDPOINT = '/api/products/for-sale';

/**
 * URL del catálogo de venta con sus filtros. Los valores `undefined` se
 * omiten para no enviar parámetros vacíos.
 */
export function urlProductosParaVenta(
  params: Record<string, string | number | boolean | undefined> = {}
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${PRODUCTS_FOR_SALE_ENDPOINT}?${query}` : PRODUCTS_FOR_SALE_ENDPOINT;
}
