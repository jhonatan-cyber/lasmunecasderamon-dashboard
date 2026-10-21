/**
 * Pares módulo/acción del flujo de traspasos bodega → bar.
 *
 * Fuente única: los consume `useTransferPermissions` en la UI (botones de
 * Transferir y de Aprobar/Rechazar) y el repositorio de transferencias y el
 * aviso push en el servidor, de modo que los botones y la API midan exactamente
 * lo mismo y ninguna superficie vuelva a comparar el nombre del rol a mano.
 *
 * Vocabulario: pares del catálogo `permissions` (los que compara `hasPermission`
 * en el cliente y sobre los que consulta el servidor con EXISTS en
 * `role_permissions`). El test `permission-catalog-alignment` exige que todo par
 * que pide la UI exista en el catálogo: por eso crear es `create` y no `write`
 * (que es el nombre del flag de la matriz, no una acción del catálogo).
 *
 * Traducción a la matriz de `withRoute` (única copia en
 * `route-permissions.toMatrixAction`):
 *  - `products.create` → flag `write` → `POST /api/bar` y `POST /api/transfers`
 *    (el flag también lo concede `products.edit`).
 *  - `products.accept_transfer` → idéntico → `PATCH /api/transfers` y
 *    `POST /api/transfers/[id]/accept`.
 *
 * El test `transferPermissions.test.ts` lee esos archivos de ruta y falla si el
 * literal del `withRoute` y estas constantes dejan de traducirse.
 */
export const TRANSFER_CREATE_PERMISSION = { module: 'products', action: 'create' } as const;

export const TRANSFER_RESOLVE_PERMISSION = {
  module: 'products',
  action: 'accept_transfer'
} as const;
