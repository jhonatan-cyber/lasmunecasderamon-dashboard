# Fase 4 — Catálogo e inventario

Fecha: 2026-10-04. Estado: un corte vertical completado (consumo de stock en
ventas, con API pública y contexto transaccional opaco).

> **Nota sobre esta historia.** Los cortes 1 a 5 se implementaron y se
> publicaron el 2026-10-04 en un único commit (`c6d13189`, «consolida el
> inventario en modules/inventario»). El 2026-10-05 esa secuencia se reconstruyó
> en un commit por corte para poder leer la fase en orden. Los cortes 2, 3 y 4
> son alta y baja de archivos enteros, así que su pertenencia a un corte es
> mecánica; los cortes 1 y 5 mezclan reescrituras de muchos archivos y
> concentran también el material del que no se puede deducir el corte (scripts,
> `package.json`, `maintenance.ts` y documentación). Los límites de estos
> commits describen el árbol en el que se comprobó cada corte, no un registro
> original de cuándo se escribió cada línea. La bitácora por cortes que sigue es
> la fuente de verdad.

## Corte 1: consumo de stock en ventas

- `SaleService` llama `consumirStockBar` desde la API pública
  `modules/inventario`; los DTO están en `contracts.ts` y la API de servidor usa
  `server-only`.
- El módulo recibe `ContextoOperacion`, resuelve el ejecutor autorizado dentro
  de su infraestructura y conserva el `trx` de la transacción de venta.
- El SQL de consumo está en `modules/inventario/bar/consumoRepositorio.ts`.
  `modules/inventario/bar/repositorio.ts` recibe el contexto opaco y resuelve la
  misma transacción que inició la venta.
- El adaptador `consume` ya se retiró de `BarQueries` y `InventoryRepository`.
  `SaleService`, las pruebas unitarias y la línea base PostgreSQL llaman la API
  pública del módulo; solo `SaleService` conserva el puente temporal porque su
  transacción aún es heredada.
- La lectura de `shot_ml`, `botella_ml` y `shots_alerta` ahora pertenece a
  `modules/inventario/bar/configuracion.ts`; Bar, Catálogo, Movimientos y
  Transferencias ya la consumen desde el API público del módulo. Se retiró el
  wrapper `lib/repositories/inventory/inventoryConfig.ts` y la fachada
  `InventoryRepository` ya no reexporta esos helpers.
- El movimiento de venta se inserta desde la infraestructura del módulo con su
  tabla y columnas explícitas; el consumo ya no depende de `BaseRepository`.
- Los cálculos puros de ml permanecen en `lib/business/shotMl.ts` porque también
  los consumen componentes y hooks. Las constantes de estado siguen viniendo del
  helper heredado `inventoryHelpers` hasta migrar el resto de operaciones.
- La lógica de stock, shots, locking, movimientos y alertas no se reescribió.
  Las alertas siguen saliendo después del commit de la venta.

## Verificación del corte 1

- Suite unitaria completa después de retirar el adaptador: 1713 aprobadas y 2
  omitidas por depender de hardware físico.
- 12 pruebas PostgreSQL focalizadas aprobadas: shots y línea base de consultas.
- Suite PostgreSQL completa: 156 aprobadas en 15 archivos.
- `pnpm typecheck`: aprobado.
- `pnpm lint:full`: 0 errores; queda 1 warning preexistente en
  `instrumentation.ts` (`no-console`).
- `pnpm build`: aprobado con Webpack; Next generó las 217 páginas.
- `next start -- --port 3107`: listo en 191 ms; `GET /api/kiosk/session`
  respondió 200.
- `pnpm arquitectura:limites`: aprobado en su momento con 26 excepciones
  heredadas vigentes, sin ciclos nuevos ni dependencias prohibidas nuevas.
- `pnpm arquitectura`: el conteo ahora reconoce repositorios bajo `modules/`.
- Prettier: verificado después de formatear todos los archivos tocados.
- Antes de migrar se creó y verificó un respaldo custom en
  `%TEMP%\lasmunecasderamon-before-migrations-20261004.dump` (369 entradas).
- Se aplicaron las 16 migraciones pendientes, de `042_envases_solo_shots.sql` a
  `057_presentaciones_capacidad_desde_nombre.sql`. `pnpm db:plan` ya no muestra
  migraciones pendientes; conserva el aviso de tres nombres históricos sin
  archivo (`003`, `011` y `014`), que el runner ignora y no se borraron.
- La suite de cierre de caja se ajustó para incorporar el saldo prepago que ya
  exista en la base y afirmar el delta introducido por sus fixtures.
- La restauración de snapshots serializa arrays JSON/JSONB. Tras la suite,
  `shot_ml` permanece en 50 y no quedan productos fixture.
- `pnpm db:plan`: sin migraciones pendientes.
- No se ejecutó `pnpm test:integration:all`.

## Siguientes cortes

1. Contratos de UI y transferencias.
2. Devolución de envases.
3. Presentaciones y unidades de catálogo.
4. Lecturas de bar, catálogo y movimientos, y retirada de la fachada.
