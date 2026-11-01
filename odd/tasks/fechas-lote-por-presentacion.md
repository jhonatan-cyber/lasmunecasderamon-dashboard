# Fechas de lote por presentación

Objetivo: que las tres fechas de lote (fecha de elaboración, duración en meses y
fecha de vencimiento) se registren por presentación —no por producto— en el
modal de crear y editar producto, y que se guarden en
`inventario_presentaciones`.

Rama: `main`. Runner: `corepack pnpm vitest run`.

## Specs

- **S1** — En el modal de crear producto, las presentaciones nuevas muestran sus
  propios inputs `Fecha de elaboración`, `Duración (meses)` y
  `Fecha de vencimiento`. Con elaboración + duración el vencimiento se calcula
  solo (día recortado al fin del mes); si se informa el vencimiento
  directamente, elaboración y duración no son necesarias.
- **S2** — En el modal de editar producto, la tarjeta de cada presentación
  existente edita esas mismas tres fechas y las guarda en esa presentación.
- **S3** — El formulario de producto ya no envía `fecha_elaboracion`,
  `duracion_meses` ni `fecha_vencimiento` en el payload del producto.
- **S4** — `inventario_presentaciones` gana las columnas
  `fecha_elaboracion date`, `duracion_meses integer` y `fecha_vencimiento date`
  (migración 110, anulables). El vencimiento se persiste resuelto: el informado
  a mano manda; si no, el calculado con elaboración + duración.
- **S5** — Se rechaza un vencimiento anterior a la elaboración, por
  presentación, igual que hoy lo hace el formulario de producto.
- **S6** — Las presentaciones que ya existían heredan las fechas que hoy tiene
  su producto (backfill de la migración), y `productos.fecha_vencimiento` sigue
  alimentando el badge y la alerta de vencimientos con el vencimiento más
  temprano entre sus presentaciones. Sin fechas por presentación, conserva el
  valor que ya tenía.

Fuera de alcance: cambiar el flujo de compras (`detalle_compras` ya guarda sus
propias fechas de lote) y mostrar las fechas por presentación fuera del modal.

## Tasks

| ID  | Specs     | Ruta   | Riesgo                                | Commit                                                              |
| --- | --------- | ------ | ------------------------------------- | ------------------------------------------------------------------- |
| T1  | S4, S6    | inline | item 1 (migración/backfill)           | `feat(inventario): fechas de lote por presentación en la base`      |
| T2  | S1-S3, S5 | inline | item 3 (contrato API + UI compartida) | `feat(productos): fechas de lote por presentación en el formulario` |

Verificación:
`corepack pnpm vitest run tests/unit/components/ProductFormFechas.test.tsx tests/unit/lib/business/vencimiento.test.ts`
y `corepack pnpm typecheck` + `corepack pnpm lint:full`.

## Log

- **L1** (2026-10-30) — "en el modal de crear y editar producto que los inputs
  de fecha de vencimiento, valido hasta y fecha de produccion que sea por
  presentacion".
- **L2** (2026-10-30) — El modal sólo tenía tres campos, todos del producto:
  `Fecha de elaboración`, `Duración (meses)` y `Fecha de vencimiento`. No existe
  ningún campo "válido hasta" en el código; se preguntó y el usuario eligió
  mover **las tres fechas actuales** a cada presentación.
- **L3** (2026-10-30) — `productos.fecha_vencimiento` se mantiene derivado del
  mínimo de sus presentaciones para que `ProductTable`, `ProductCard` y
  `VencimientoAlert` sigan mostrando algo. `COALESCE` conserva el valor previo
  cuando ninguna presentación tiene fecha.
- **L4** (2026-10-30) — T1 cerrada: migración 110 (tres columnas anulables +
  backfill idempotente `COALESCE`), `vencimientoProducto.ts` como único lugar
  que sincroniza `productos.fecha_vencimiento`, presentaciones (alta, edición de
  fechas y borrado) y los dos bucles de producto pasando las fechas. Evidencia:
  `pnpm typecheck` ✓, `pnpm lint:full` ✓ (0 errores, avisos preexistentes),
  `pnpm arquitectura:limites` ✓,
  `pnpm vitest run tests/unit/lib/services/ProductService.test.ts` ✓ 39/39.
  `pnpm db:verify` **no se pudo correr**: no hay Postgres escuchando en
  `127.0.0.1:5433` en esta máquina, así que el drill de migraciones queda
  pendiente para CI.
- **L5** (2026-10-30) — T2 cerrada: los tres campos salen del formulario de
  producto y aparecen en cada presentación (fila nueva y tarjeta de edición),
  con `recalcularVencimiento` compartido por los dos hooks; la validación de
  orden pasa a `validatePresentaciones`. Evidencia:
  `pnpm vitest run tests/unit/components/ProductFormFechas.test.tsx` ✓ 5/5 (RED
  observado antes de implementar),
  `pnpm vitest run tests/unit/lib/business/vencimiento.test.ts` ✓ 13/13,
  `pnpm test:unit` ✓ 3237/3242 — los 3 fallos restantes son de
  `tests/unit/lib/biometric/*` por trabajo en curso ajeno a esta feature.
  `pnpm typecheck` ✓ y `pnpm lint:full` ✓.
- **L6** (2026-10-30) — `parsePresentaciones` incluye las fechas sólo si el
  usuario las informó, para que un alta sin fechas de lote mande al repositorio
  exactamente el mismo payload que antes (`ProductService.test.ts` lo fija).
