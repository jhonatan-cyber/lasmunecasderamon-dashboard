# Endurecimiento del módulo Bodega (`modules/inventario`)

Objetivo: cerrar los siete hallazgos de la auditoría del módulo que la UI llama
"Bodega". Rama actual: `main`. Estrategia de entrega: `ask-on-risk`. Runner:
`vitest` (`corepack pnpm test:unit`).

## Specs

- **S1 — Borrado de producto con guardas.** `DELETE /api/products?id=` no debe
  borrar un producto con unidades, movimientos, compras o referencias en
  colaciones/entradas. Debe responder 409 con un mensaje accionable. Un producto
  sin dependencias puede borrarse.
- **S2 — Borrado de presentación con guardas.**
  `DELETE /api/products/presentations?id=` no debe dejar unidades huérfanas ni
  borrar una presentación referenciada por colaciones, entradas o movimientos.
  Debe responder 409. Sin dependencias, puede borrarse.
- **S3 — Borrado de categoría sin pérdida de auditoría.**
  `DELETE /api/categories/[id]` no debe borrar `inventario_movimiento_unidades`
  ni productos con stock/historial. Debe responder 409 y el preview debe
  informar `canDelete`/`blockedReason`.
- **S4 — Reactivación de categoría sin revivir productos manuales.** Al
  desactivar una categoría se marcan solo los productos que estaban activos; al
  activarla se reactivan solo esos. Un producto desactivado a mano sigue
  inactivo.
- **S5 — `inactivas` real.** `ProductService.listUnits` debe devolver el total
  de unidades inactivas del producto (con los mismos filtros de ubicación y
  presentación), no el conteo de la página.
- **S6 — Compras sin desborde de `integer`.** Un `subtotal` o `total` mayor a
  2147483647 debe rechazarse con `ValidationError` antes de tocar la base.
- **S7 — `stock_almacen` de solo lectura.** Las escrituras públicas de producto
  deben rechazar `stock_almacen`; el stock se deriva de las unidades.
- **S8 — DTOs internos autenticados.** `GET /api/products/presentations` y
  `GET /api/products/units` deben exigir sesión y permiso `products.read`; dejan
  de ser `withPublicRoute`.

## Tasks

| ID  | Specs  | Ruta   | Estado                           |
| --- | ------ | ------ | -------------------------------- |
| T1  | S1, S7 | inline | pendiente                        |
| T2  | S2     | inline | pendiente                        |
| T3  | S3, S4 | inline | pendiente                        |
| T4  | S5, S6 | inline | pendiente                        |
| T5  | S8     | inline | pendiente                        |
| T6  | S1-S8  | inline | pendiente (tests + verificación) |

## Log

- **L1 (2026-10-19):** el usuario pidió: «soluciona todos los puntos», en
  referencia a los siete hallazgos de la auditoría del módulo Bodega
  (`modules/inventario`): borrados duros sin guardas, borrado de categoría con
  pérdida de auditoría, DTOs públicos con costo/inventario interno, reactivación
  de categoría que revive productos, `inactivas` page-local, desborde de
  `integer` en compras y `stock_almacen` aceptado en updates.
