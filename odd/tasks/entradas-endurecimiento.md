# Entradas — endurecimiento

Objetivo: validar el precio de la entrada en el servidor y cerrar los hallazgos
de la auditoría del módulo. Branch: `main`; la entrega quedó en los commits
`03aceab0`, `0468500e`, `925eb799`, `71257bda` y `14c4bc1d` (ver L9). Estrategia
de entrega: un solo cambio revisable. Runner: `corepack pnpm test:unit` (y
`corepack pnpm typecheck`, `corepack pnpm arquitectura:limites`).

## Specs

S1. `registrarEntrada` valida `monto_entrada === costo_entrada × partes.length`.
El costo se lee de `configuraciones` (`clave = 'costo_entrada'`) y, si falta la
fila, del default del registro. Si no coincide, lanza `ValidationError` con el
precio esperado antes de abrir la unidad y sin escribir nada.

S2. `POST /api/entradas` envuelve el registro en `runIdempotent`
(`endpoint: 'entradas.create'`, `usuarioId`). La página envía
`x-idempotency-key` estable por intención y lo regenera cuando cambia el
payload.

S3. `entradas_clientes.fecha_crea` usa el reloj del servidor
(`DEFAULT CURRENT_TIMESTAMP`). `fecha` y `hora` siguen siendo datos de negocio
elegidos por el cajero.

S4. Invariante de cobro: sin adicional la entrada se cobra con
`registrarMovimientoCobro`; con adicional se registra como venta (`onVenta` →
`SaleService`) y no se llama a `registrarMovimientoCobro`. Documentado en el
módulo y cubierto por tests.

S5. La UI suma como ingreso base únicamente los grupos sin `venta_id`; un grupo
con venta ya se contó como ingreso en ventas.

S6. Payload legacy sin `partes`: se expande a `cantidad_entradas` partes, con el
adicional en la primera, igual que el payload nuevo.

S7. Migración `091` agrega un índice único parcial en `ventas(entrada_id)`.

S8. Tests unitarios del módulo y de la ruta: precio, reparto, `fecha_crea`,
invariante de cobro, idempotencia, partes legacy y mapeo de errores.

## Tasks

- [x] T1 — Módulo: precio del servidor, `fecha_crea`, invariante de cobro (S1,
      S3, S4) — inline. Evidencia: `modules/entradas/repositorio.ts:88-103`
      (lectura del costo), `142-150` (validación), `244-265` (INSERT sin
      `fecha_crea`), `367-374` (invariante de cobro).
- [x] T2 — Ruta: idempotencia y partes legacy (S2, S6) — inline. Evidencia:
      `app/api/entradas/route.ts:18-82` (normalizadores), `84-140`
      (`runIdempotent` + mapeo de `AppError`).
- [x] T3 — UI: clave de idempotencia y conciliación por `venta_id` (S2, S5) —
      inline. Evidencia: `app/entradas/page.tsx:160` (ref), `428-438` (total por
      `venta_id`), `540-568` (firma + header), `584` (reset).
- [x] T4 — Migración 091 (S7) — inline. Evidencia:
      `migrations/091_ventas_entrada_id_unica.sql`.
- [x] T5 — Tests del módulo y de la ruta (S8) — inline. Evidencia:
      `tests/unit/modules/entradas/registrar-entrada.test.ts` (8),
      `tests/unit/app/entradasRoute.test.ts` (5).
- [x] T6 — Verificación: typecheck, lint, unit y gate de arquitectura. Evidencia
      en L6.

## Log

L1 (verbatim): "analiza el modulo entradas"

L2 (verbatim): "deve validarse , soluciona todos los puntos porfavor"

L3: Decisión — el precio se valida con igualdad estricta contra
`costo_entrada × entradas`; no se admiten promociones ni invitados sin un cambio
de contrato explícito.

L4: La caja se sigue resolviendo con la caja abierta más reciente
(`ORDER BY fecha_apertura DESC LIMIT 1`), igual que colaciones, personal, ventas
y reportes. No se cambia: es la convención del repo y cambiarla solo en entradas
introduciría una divergencia.

L5: RED observado — con la comparación relajada (`>` en lugar de `!==`) fallan 2
tests de precio; restaurada la igualdad estricta, los 8 pasan.

L6: Verificación — `pnpm typecheck` ✅; ESLint sobre los 5 archivos ✅; 13 tests
nuevos ✅; suite completa 2699 passed / 2 skipped / 1 failed pre-existente
(`tests/unit/scripts/limites-arquitectura.test.ts`, por
`seed/seed-productos.mjs` sin trackear, ajeno a este cambio); `pnpm build` ✅
con `NODE_OPTIONS=--max-old-space-size=6144` (sin eso, el worker de Next agota
el heap de 2 GB).

L7: Alcance del payload legacy — se conserva su semántica: sin
`productos_cortesia` y con `monto_bebida_adicional > 0` el módulo rechaza porque
no hay producto que respalde la venta, igual que antes. La expansión de `partes`
sí corrige el caso de cortesía con `cantidad_entradas > 1`, que antes no
cuadraba (`totalProductosCortesia !== partes.length`).

L8: Migración 091 aplicada en la base local (`127.0.0.1:5432/lasmunecasderamon`)
con `pnpm db:migrate`. Antes: 0 duplicados en `ventas.entrada_id`. Después:
`idx_ventas_entrada_id_unica` (único parcial, `WHERE entrada_id IS NOT NULL`)
presente, `idx_ventas_entrada_id` eliminado, ledger con 091 y `db:plan` sin
pendientes. El aviso de 011/014 huérfanas es pre-existente y no bloquea.

L9: Entrega — commits en `main`: `03aceab0` (código muerto), `0468500e`
(sidebar), `925eb799` (seed de productos), `71257bda` (endurecimiento de
entradas) y `14c4bc1d` (docs y snapshot). El gate de arquitectura quedó en 0
hallazgos al agregar `seed/seed-productos.mjs` a `ESCRITORES_TECNICOS`, igual
que los otros seeds de desarrollo. La suite completa dio 2699 passed / 2 skipped
y un timeout de worker en `auth-routes.test.ts`, que pasa aislado (4/4). El
snapshot `analisis.json` lo regenera la propia suite con el hash de HEAD; se
revirtió para no dejar el árbol sucio.
