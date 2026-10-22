# Ventas: origen persistido (entrada, servicio, habitación, pedido, barra)

Rama: `main` (working tree). Runner: `corepack pnpm test:unit` /
`corepack pnpm test:postgres` / `corepack pnpm typecheck`. Estrategia de
entrega: `ask-on-risk`.

## Specs

- **S1 — La venta sabe de dónde nació.** `ventas.origen` es
  `varchar(20) NOT NULL` con CHECK `entrada|servicio|habitacion|pedido|barra`.
  El valor se escribe al crear la venta y no se deduce después en cada consulta.
  `cuenta` **no** es un origen válido: el módulo de cuentas pospago se reemplazó
  por prepago y ya no genera ventas.
- **S2 — Una sola prioridad, la misma para todo.** `resolverOrigenVenta` decide
  en este orden: `entrada > servicio > habitacion > pedido > barra`. Es la misma
  prioridad que ya usa `OrigenCorto` en el bar (sin `cuenta`), así que el origen
  guardado y el derivado nunca se contradicen.
- **S3 — Backfill del histórico.** La migración completa las filas existentes
  con esa prioridad usando las columnas que ya tiene la tabla (`entrada_id`,
  `servicio_id`, `habitacion_id`, `pedido_id`). Ninguna fila queda en NULL.
- **S4 — La venta del upgrade queda como `entrada`.** Es el origen que aporta
  `options.entradaId` de `SaleService`, el único camino que liga una venta a
  `entradas_clientes`.
- **S5 — El origen no se acepta desde el HTTP.** `SaleCreateSchema` no expone
  `origen`: lo decide el servidor. Un cliente no puede etiquetar su propia venta
  ni, con eso, cambiar si postea a caja.
- **S6 — Consulta.** Índice `(origen, fecha_crea)` para reportes por origen y
  `origen` expuesto (aditivo) en el DTO de lectura de ventas.

## Tasks

- ✅ T1 · `lib/business/ventasOrigen.ts`: enum, tipo, default y
  `resolverOrigenVenta` (S2).
- ✅ T2 · Tests unitarios de la matriz de prioridad, incluidos los solapes
  (`entrada + pedido`, `servicio + habitacion`, `habitacion + pedido`) (S2).
- ✅ T3 · Migración `098_ventas_origen.sql`: columna, backfill, `NOT NULL`,
  CHECK e índice (S1, S3, S6).
- ✅ T4 · Escritura: `registrarCabeceraVenta` acepta `origen` y `registrarVenta`
  lo resuelve desde `options.entradaId`, `servicio_id`, `habitacion_id` y
  `pedido_id` (S1, S2, S4).
- ✅ T5 · Lectura: `VentaRow`/`SaleSchema`/`mapSaleFromDB` con `origen` (S6).
- ✅ T6 · Test PostgreSQL: venta de barra directa → `origen = 'barra'`; venta
  del upgrade → `origen = 'entrada'`; el CHECK rechaza `'cuenta'` y los NULL
  (S1, S3, S4).
- 🔶 T7 · Checks: `db:migrate` ✅, `typecheck` ✅, `test:unit` ✅,
  `test:postgres` ✅, `eslint` ✅, `build` **bloqueado** por el aviso de
  seguridad de Next 16.4.0 (el código compila; el corte es de política).

## Log

- L1 · Pedido original (verbatim): "ya que debemos saber de donde viene la venta
  si es de entrada , pedido, servicio o directamente de la barra".
- L2 · Corrección (verbatim): "ese rigen de cuenta ya no lo usaremos ya que
  antes teniamos el modulo cuenta pospago ahora es prepago".
- L3 · Decisión: el enum queda sin `cuenta`. El código de `cobrar-cuenta` y
  `lib/business/cuentaSale.ts` no se toca en este cambio: dejar de usarlo es una
  decisión de negocio, borrarlo es otra tarea. Si esa ruta corriera igual, la
  venta se etiqueta por sus FKs, no como `cuenta`.
- L4 · Decisión: se conserva `habitacion` porque `ventas.habitacion_id` se sigue
  escribiendo (una venta cargada a habitación sin servicio no es `barra`).
- L5 · Evidencia (migración): `corepack pnpm db:migrate` →
  `Applied: 098_ventas_origen.sql`. Verificado contra la base real:
  `origen varchar(20) NOT NULL DEFAULT 'barra'`, `ventas_origen_check` con
  `entrada|servicio|habitacion|pedido|barra`, índice
  `idx_ventas_origen_fecha (origen, fecha_crea)`, 0 filas nulas y 0 filas
  incoherentes con sus vínculos. La única venta histórica quedó como `pedido`,
  que es lo que declaran sus columnas.
- L6 · Evidencia (suites): `test:unit` → 382 archivos / 2966 tests en verde,
  exit 0; `test:postgres` → 39 archivos / 243 tests, exit 0; `typecheck` 0;
  `eslint` 0.
- L7 · Bloqueo (build): `next build` compila (`✓ Compiled successfully`) y
  después aborta con
  `SecurityFatalError: Your version of Next.js is affected by a known security vulnerability`
  (Next 16.4.0). El reintento que sugiere el propio aviso no funciona con
  `build` porque el permiso se guarda en
  `.next/cache/next-agentic-upgrade-retries` y `next build` limpia `.next` al
  arrancar. No se toca la política de seguridad ni la versión: el arreglo es
  `next upgrade --agent=security`, que cambia dependencias y requiere decisión
  del usuario.
