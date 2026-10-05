# Corte 24 — Fase 7 parcial: lecturas de ventas y retiro de inserts muertos

Fecha: 2026-10-05. Primer corte de retirada de adaptadores: `SaleQueries` pierde
las lecturas y los inserts sin llamadores; `SaleService` ya no importa
`SaleRepository`.

## Implementación

- `modules/ventas/lecturas` gana `listarVentas` y `obtenerVenta`, mismo SQL que
  `SaleQueries.getAll`/`getById` (incluye el resumen de caja y las lecturas
  cruzadas declaradas a clientes, usuarios, habitaciones, pedidos y productos,
  que la fase 6 acotará).
- `SaleService` compone lecturas del módulo; `SaleRepository` delega lo que
  queda (escrituras de anulación, lecturas y borrado).
- Se eliminan `rawInsert`/`insertDetail`/`insertUserRelation` de ambos (nadie
  los llamaba en producción desde el corte 13) y el borrado físico vive en el
  módulo (`eliminarVenta`, sólo tests heredados).
- Tests: se retira el mock de `SaleRepository` en `SaleService.test.ts` (el
  servicio ya no lo importa).

## Validación

- `pnpm typecheck`: limpio.
- `pnpm arquitectura:limites`: 29/29, sin novedades.
- `pnpm test:unit`: 1735 + 2 omitidas.
- `pnpm test:postgres`: 184/184.
- `eslint` sobre los 8 archivos tocados: sin hallazgos.

## Deuda restante

- `SaleRepository`/`SaleQueries` conservan delegación de escrituras, lecturas y
  borrado para rutas alternas y suites heredadas; su retiro total espera a fase
  6 (lecturas de Reportes).
- Mismo patrón pendiente en servicios, cuentas, clientes, caja y personal.
