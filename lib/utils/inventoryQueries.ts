/** Consultas cuyo stock o catálogo cambia al ingresar o mover mercadería. */
export const INVENTORY_QUERY_TARGETS = [
  'products',
  'product-presentations',
  '/api/products',
  'categories',
  '/api/categories',
  '/api/bar',
  '/api/transfers',
  '/api/purchases',
  'dashboard'
] as const;

export function matchesInventoryQuery(queryKey: readonly unknown[]): boolean {
  const root = queryKey[0];
  return (
    typeof root === 'string' &&
    INVENTORY_QUERY_TARGETS.some(
      target =>
        root === target ||
        (target.startsWith('/') && (root.startsWith(`${target}?`) || root.startsWith(`${target}/`)))
    )
  );
}
