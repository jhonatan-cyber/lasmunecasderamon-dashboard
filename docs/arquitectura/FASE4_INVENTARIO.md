# Fase 4 — Catálogo e inventario

Fecha: 2026-10-04. Estado: siete cortes verticales completados (consumo de stock
en ventas, transferencias, devolución de envases, catálogo
presentaciones/unidades, lecturas de bar/catálogo/movimientos, resumen de
envases y dueño de los estados de unidad).

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

## Corte 2: contratos de UI y transferencias

- Los DTO que la UI consumía desde la fachada heredada (`ShotAlert`,
  `ShotsSummary`, `DevolucionEnvase*`, `ConsumoInventarioDetalle`,
  `TraspasoInput`/`TraspasoResultado`) ahora se definen en
  `modules/inventario/contracts.ts`; `inventoryTypes.ts` los reexporta para
  quienes aún importan la fachada.
- `app/bar`, `components/bar`, `components/products` y `hooks/productos`
  importan esos tipos desde el contrato del módulo: se retiraron las 4
  excepciones `ui-no-infraestructura` de `excepciones.json` (26 → 22), y la
  puerta exige que ninguna quede obsoleta.
- Transferencias completas detrás de la API pública
  `modules/inventario/transferencias`: `traspasarAlBar`, `aceptarTransferencia`,
  `rechazarTransferencia` y `listarTransferencias` aceptan `ContextoOperacion`
  opaco y, sin contexto, abren su propia unidad y sólo notifican
  `transfers_updated` después del commit.
- Rutas `/api/transfers*` y `ProductService` llaman el módulo; la fachada
  `InventoryRepository` perdió `traspasarAlBar(Standalone)`,
  `accept/rejectTransfer(Standalone)` y `listTransfers`, y `BarQueries` perdió
  sus métodos de traspaso (hoy sólo lecturas de bar y resumen de shots).
- Se borró `lib/repositories/inventory/TransferQueries.ts` sin consumidores
  restantes; el SQL vive en `modules/inventario/transferencias/repositorio.ts`.
- Las pruebas de transferencias (unitarias, de aprobación y PostgreSQL) migraron
  a la API pública del módulo con `conContextoOperacionExistente` para las
  variantes con transacción heredada.

## Corte 3: devolución de envases

- El control bar → almacén completo vive en `modules/inventario/envases/`:
  `verificarEnvase` (entrega del vacío en el bar), `confirmarRecepcionEnvase`
  (recepción en almacén) y `listarDevoluciones` (historial) son la API pública;
  con `ContextoOperacion` escriben en la transacción del flujo llamante y sin
  contexto abren la suya.
- El SQL se movió 1:1 desde `lib/repositories/inventory/EnvaseQueries.ts`
  (buscado con `FOR UPDATE`, marcas de `fecha_devolucion`/`fecha_confirmacion`,
  motivos de rechazo `no_es_nuestro`/`no_esta_vacia`/`venta_entera`/
  `ya_devuelto`/`no_entregado`/`ya_confirmado`). El archivo se borró sin
  consumidores restantes.
- `ProductService.verifyAndReturnContainer`, `confirmContainerReturn` y
  `listContainerReturns` ahora delegan al módulo; las rutas
  `/api/bar/containers*` no cambian. La fachada `InventoryRepository` perdió
  esos cinco métodos y ya no importa `EnvaseQueries`.
- Estas operaciones no tienen efectos posteriores al commit: la entrega y la
  recepción son sólo marcas físicas sobre la unidad, sin movimientos de
  inventario ni notificaciones SSE (el panel sigue refrescando por sondeo).
- Las pruebas unitarias (núcleos con `conContextoOperacionExistente`, wrappers
  con `withTransaction` mockeado) y `tests/postgres/bar-containers-flow.test.ts`
  migraron a la API del módulo.

## Corte 4: presentaciones y unidades de catálogo

- `modules/inventario/presentaciones/` y `modules/inventario/unidades/` absorben
  el SQL de `PresentacionQueries` y `UnidadQueries` (los dos archivos se
  borraron): alta/edición/borrado de presentaciones, generación de unidades con
  códigos `LM-…` y EAN-13, cambio de estado, listado, marca de impresión y
  `sincronizarStockTotal`.
- API pública: `crearPresentacion`, `actualizarPresentacion`,
  `actualizarFotoPresentacion`, `eliminarPresentacion`, `obtenerPresentacion`,
  `buscarPresentacionPorCodigo`, `listarPresentaciones(PorProductos)`,
  `generarUnidades`, `registrarUnidades` (alta atómica = generación + sync),
  `cambiarEstadoUnidades`, `sincronizarStockTotal`, `listarUnidades` y
  `marcarUnidadesImpresas`; con `ContextoOperacion` escriben en la transacción
  del flujo llamante y sin contexto abren la suya.
- `ProductService` delega al módulo; la ruta `units/printed` llama al módulo
  directamente (los `route.ts` de `app/api` son adaptadores de servidor y pueden
  importar la API pública).
- `ProductRepository` (creación/edición de producto) y `PurchaseService`
  (compras) escriben presentaciones y unidades dentro de su propia transacción:
  usan `conContextoOperacionExistente`, el mismo puente heredado que
  `SaleService`. Las dos aristas están registradas en `excepciones.json` con
  motivo, responsable y condición de retiro (22 → 24 excepciones, ninguna
  obsoleta).
- `transferencias/repositorio.ts` ahora usa `../unidades/repositorio` para el
  sync de stock (misma subdomaña del módulo).
- **Hito:** `lib/repositories/inventory/` ya no contiene ninguna escritura
  (INSERT/UPDATE/DELETE): todas las escrituras de inventario viven en
  `modules/inventario/*`. Los 4 escritores de `inventario_unidades` son
  repositorios del módulo (consumo, envases, transferencias, unidades).- La
  fachada `InventoryRepository` perdió los 18 métodos de presentaciones y
  unidades; quedan sólo bar, catálogo y movimientos (lecturas). Métodos muertos
  sin consumidores (`findByUnitBarcode`, `countUnits`, `setUnitsEstado(trx)`) no
  se migraron: se eliminaron.

## Corte 5: lecturas de bar, catálogo y movimientos; retirada de la fachada

- Las últimas lecturas pasaron al módulo: `bar/stockRepositorio.ts`
  (`listarStockBar`, `obtenerResumenShots` y el tolerant
  `obtenerMaxAnfitrionasPorProducto`), `catalogo/repositorio.ts` + `servicio.ts`
  (`listarParaVenta`) y `movimientos/repositorio.ts` + `servicio.ts`
  (`listarMovimientos`, `listarMovimientosRecientes`). SQL movido 1:1; son
  lecturas puras, sin unidad de trabajo ni efectos.
- `ProductService` (y por tanto las rutas de Bar, productos y movimientos)
  consume el módulo; `lib/business/shotAlerts.ts` toma `ShotAlert` desde
  `contracts.ts`.
- **Se borró la fachada `InventoryRepository.ts`** junto con `BarQueries`,
  `CatalogoQueries` y `MovimientoQueries`. En `lib/repositories/inventory/` sólo
  quedan `inventoryHelpers.ts` (mapeos y EAN-13; las constantes de estado
  pasaron al módulo en el corte 7) e `inventoryTypes.ts`, que son helpers y
  tipos puros compartidos por el módulo.
- El test `tests/unit/lib/repositories/InventoryRepository.test.ts` pasó a
  `tests/unit/modules/inventario-dominio.test.ts` (mismo contenido, ahora contra
  la API del módulo).
- **Estado de la fase:** todo el SQL de inventario (lecturas y escrituras) vive
  en `modules/inventario`; no queda ningún escritor ni lector de inventario en
  `lib/repositories/inventory/`.

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
- `pnpm arquitectura`: 204 rutas, 35 rutas con SQL directo, 92 archivos con SQL
  fuera de repositorios, 13 tablas con varios escritores y 5 ciclos. El conteo
  ahora reconoce repositorios bajo `modules/`.
- Prettier: verificado después de formatear todos los archivos tocados.
- Los totales están en [Módulos y datos](../MODULOS_Y_DATOS.md).
- Antes de migrar se creó y verificó un respaldo custom en
  `%TEMP%\lasmunecasderamon-before-migrations-20261004.dump` (369 entradas).
- Se aplicaron las 16 migraciones pendientes, de `042_envases_solo_shots.sql` a
  `057_presentaciones_capacidad_desde_nombre.sql`. `pnpm db:plan` ya no muestra
  migraciones pendientes; conserva el aviso de tres nombres históricos sin
  archivo (`003`, `011` y `014`), que el runner ignora y no se borraron.
- `pnpm test:postgres`: **156 aprobadas en 15 archivos** contra
  `lasmunecasderamon`, después de aplicar las migraciones pendientes.
- Después de retirar el adaptador, 98 pruebas unitarias focalizadas pasaron y
  `tests/postgres/linea-base-flujos.test.ts` pasó sus 6 flujos, incluido el
  consumo de inventario.
- Tras mover configuración e inserción: 93 pruebas unitarias focalizadas y 12
  pruebas PostgreSQL focalizadas aprobadas.
- La suite completa se repitió tras la extracción: 1713 unitarias aprobadas, 2
  omitidas por hardware y los 12 flujos PostgreSQL focalizados aprobados.
- La suite de cierre de caja se ajustó para incorporar el saldo prepago que ya
  exista en la base y afirmar el delta introducido por sus fixtures.
- La restauración de snapshots serializa arrays JSON/JSONB. Tras la suite,
  `shot_ml` permanece en 50 y no quedan productos fixture.
- `pnpm db:plan`: sin migraciones pendientes. El runner conserva el aviso sobre
  tres migraciones históricas sin archivo (`003`, `011` y `014`), que se
  ignoraron sin alterar su historial.
- No se ejecutó `pnpm test:integration:all`.

## Verificación del corte 2

- `pnpm typecheck`: aprobado.
- `pnpm lint:full`: 0 errores; 1 warning preexistente (`instrumentation.ts`).
- Prettier verificado en todos los archivos tocados.
- `pnpm test:unit --maxWorkers=2`: **1713 aprobadas, 2 omitidas** (180
  archivos).
- `pnpm arquitectura:limites`: aprobado; **22 hallazgos / 22 excepciones**, sin
  dependencias prohibidas nuevas ni excepciones obsoletas (las 4 de UI se
  eliminaron al apuntar la UI a `contracts.ts`).
- `pnpm arquitectura`: análisis regenerado (`FASE0_DIAGNOSTICO.md` y
  `analisis.json`); `inventario_unidades` queda con 4 escritores:
  `EnvaseQueries`, `UnidadQueries` y los dos repositorios del módulo (consumo y
  transferencias).
- Pruebas PostgreSQL focalizadas contra la base local: **13 aprobadas** en
  `transfers-flow`, `bar-shots-flow` y `linea-base-flujos`.- No se ejecutó la
  suite PostgreSQL completa ni `pnpm test:integration:all` en este corte.
- `pnpm build`: aprobado (Webpack + service worker) después del corte 2.
- `pnpm test:postgres` completa: **156 aprobadas en 15 archivos**.

## Verificación del corte 3

- `pnpm typecheck`: aprobado.
- `pnpm lint:full`: 0 errores; 1 warning preexistente (`instrumentation.ts`).
- Prettier verificado en todos los archivos tocados.
- `pnpm test:unit --maxWorkers=2`: **1713 aprobadas, 2 omitidas** (180
  archivos).
- `pnpm arquitectura:limites`: aprobado; **22 hallazgos / 22 excepciones**, sin
  dependencias prohibidas nuevas ni excepciones obsoletas.
- `pnpm arquitectura`: análisis regenerado; `EnvaseQueries` ya no aparece y
  `inventario_unidades` queda con 4 escritores: `UnidadQueries` y los tres
  repositorios del módulo (consumo, transferencias y envases).
- Pruebas PostgreSQL focalizadas: **16 aprobadas** en 4 archivos (envases,
  transferencias, shots y línea base).
- No se ejecutaron la suite PostgreSQL completa ni `pnpm test:integration:all`
  en este corte.

## Verificación del corte 4

- `pnpm typecheck`: aprobado.
- `pnpm lint:full`: 0 errores; 1 warning preexistente (`instrumentation.ts`).
- Prettier verificado en todos los archivos cambiados.
- `pnpm test:unit --maxWorkers=2`: **1713 aprobadas, 2 omitidas** (180
  archivos).
- `pnpm arquitectura:limites`: aprobado; **24 hallazgos / 24 excepciones** (las
  2 nuevas del puente en ProductRepository y PurchaseService), sin dependencias
  prohibidas nuevas ni excepciones obsoletas.
- `pnpm arquitectura`: análisis regenerado; `PresentacionQueries` y
  `UnidadQueries` ya no aparecen; los 4 escritores de `inventario_unidades` son
  repositorios de `modules/inventario`.
- `pnpm test:postgres` completa: **156 aprobadas en 15 archivos** (incluye
  creación de producto, compras y transfers contra la base local).
- `pnpm build`: aprobado (Webpack + service worker).
- No se ejecutaron `pnpm test:integration:*` ni e2e.

## Verificación del corte 5

- `pnpm typecheck`: aprobado.
- `pnpm lint:full`: 0 errores; 1 warning preexistente (`instrumentation.ts`).
- Prettier verificado en todos los archivos cambiados.
- `pnpm test:unit --maxWorkers=2`: **1713 aprobadas, 2 omitidas** (180
  archivos).
- `pnpm test:postgres` completa: **156 aprobadas en 15 archivos**.
- `pnpm arquitectura:limites`: aprobado; **24 hallazgos / 24 excepciones**, sin
  dependencias prohibidas nuevas ni excepciones obsoletas.
- `pnpm arquitectura`: análisis regenerado; `InventoryRepository` y los tres
  `<X>Queries` de inventario ya no aparecen.
- `pnpm build`: aprobado (Webpack + service worker).
- No se ejecutaron `pnpm test:integration:*` ni e2e.

## Corte 6: resumen de envases de la alerta

- La última lectura de inventario fuera del módulo era el contador que alimenta
  la campana de envases sin recibir (`lib/business/containerAlerts.ts`). Pasa al
  módulo como `obtenerResumenEnvases` (SQL 1:1, con `HORAS_ENVASE_SIN_CONFIRMAR`
  y el tipo `ResumenEnvases` en el dominio); `lib/business` conserva la alerta,
  el SSE y el push, y reexporta el nombre heredado `getContainerReturnsSummary`
  para no cambiar la API de rutas y pruebas.
- **Estado:** no queda SQL de inventario fuera de `modules/inventario` salvo
  `lib/database/maintenance.ts`, que lee `inventario_unidades` para reconstruir
  secuencias en el snapshot de la base y no es una lectura de dominio.
- `pnpm typecheck`: aprobado. `pnpm lint:full`: 0 errores; 1 warning
  preexistente. Prettier verificado.
- `pnpm test:unit --maxWorkers=2`: **1713 aprobadas, 2 omitidas** (el test de
  `containerAlerts` sigue comprobando el SQL y la hora del negocio sin cambios,
  porque el módulo usa el mismo `query`).
- `pnpm test:postgres` completa: **156 aprobadas en 15 archivos**.
- `pnpm arquitectura:limites`: aprobado; **24 hallazgos / 24 excepciones**.
- `pnpm build`: aprobado.

## Corte 7: dueño de los estados de unidad

- `ESTADO_UNIDAD_ACTIVA`, `ESTADO_UNIDAD_INACTIVA`, `ESTADO_UNIDAD_VENDIDA`,
  `ESTADOS_UNIDAD_VALIDOS` y `esEstadoUnidadValido` se movieron de
  `lib/repositories/inventory/inventoryHelpers.ts` a
  `modules/inventario/estados.ts`, que los publica por la API pública del
  módulo. Son vocabulario del dominio (qué significa `estado` y cuáles son
  válidos al dar de baja), no una función compartida como los mapeos o el
  EAN-13, así que su dueño natural es el módulo y no un helper huérfano de la
  capa heredada.
- Los siete repositorios del módulo (consumo, stock de bar, catálogo, envases,
  presentaciones, transferencias y unidades) interpolan ya esas constantes desde
  `../estados`; `ProductService` valida el estado contra `esEstadoUnidadValido`
  importado de `@/modules/inventario`, igual que el resto de sus operaciones.
  `inventoryHelpers.ts` conserva sólo funciones puras: opciones de venta,
  resolución de botella, mapeos de filas y generación de EAN.
- **Contratos de UI, revisión pendiente: nada.** Se comprobó que ninguna
  importación en `components/`, `hooks/` y `app/` referencia ya
  `lib/repositories/inventory`, `InventoryRepository` ni `inventoryTypes`; los
  DTO de inventario (incluidos `ResumenEnvases`, del corte 6) llegan desde
  `modules/inventario/contracts.ts`. No hay entradas que migrar ni excepciones
  `ui-no-infraestructura` que retirar.
- `inventoryTypes.ts` mantiene la reexportación de los DTO para los tipos de
  fila heredados, pero ya no expone estados.

## Verificación del corte 7

- `pnpm typecheck`: aprobado.
- `pnpm lint:full`: 0 errores; 1 warning preexistente (`instrumentation.ts`).
- Prettier verificado en todos los archivos cambiados.
- `pnpm test:unit --maxWorkers=2`: **1713 aprobadas, 2 omitidas** (180
  archivos). `ProductService.test.ts` mockea ahora `esEstadoUnidadValido` a
  través del mock de `@/modules/inventario`, que es donde lo consume el
  servicio.
- `pnpm test:postgres` completa: **156 aprobadas en 15 archivos**; las tres
  pruebas que usaban `ESTADO_UNIDAD_*` (`bar-containers-flow`, `bar-shots-flow`,
  `transfers-flow`) los toman de la API pública del módulo.
- `pnpm arquitectura:limites`: aprobado; **24 hallazgos / 24 excepciones**, sin
  dependencias prohibidas nuevas ni excepciones obsoletas.
- `pnpm arquitectura`: análisis regenerado; el archivo nuevo es el único cambio
  de métrica (1525 → 1526 archivos analizados); los archivos con SQL y con
  `withTransaction` siguen siendo los mismos.
- `pnpm build`: aprobado (Webpack + service worker).
- No se ejecutaron `pnpm test:integration:*` ni e2e.

## Corte 8: reversión de stock por anulación

**Qué faltaba.** Anular una venta devolvía la plata y se quedaba con las
botellas: `SaleQueries.updateStatus(0)` y `approveAnulacion` ajustan caja,
prepago, comisiones y propinas, y nunca tocaban `inventario_unidades`. La
botella quedaba en el bar con estado `vendida` y la venta siguiente de lo mismo
ya no la encontraba. La fase 4 pedía «consumir y revertir existencias mediante
operaciones de negocio», y sólo la mitad estaba.

**Por qué no se podía hacer sin esquema.** `inventario_movimientos` anotaba qué
presentación salió, cuántas unidades y cuánta ml, pero no qué venta lo consumió
ni qué botellas tocó. Sin esa cadena, devolver el stock era adivinar.

**Migración 058** (`migrations/058_reversion_stock_anulacion.sql`):

- `inventario_movimientos.venta_id`: la venta que consumió el stock.
- `inventario_movimientos.movimiento_origen`: el consumo que una fila de tipo
  `devolucion` deshace. La reversión **no borra** el consumo: escribe un
  movimiento nuevo que apunta al original, así el historial sigue contando lo
  que salió y lo que volvió.
- `inventario_movimiento_unidades (movimiento_id, unidad_id, ml_consumido)`: qué
  unidades tocó cada movimiento y cuánta ml les quitó. Es lo que hace la
  reversión exacta en vez de aproximada.

Las filas anteriores quedan con `venta_id` nulo: no se puede reconstruir a qué
venta pertenecía un movimiento viejo, y por eso la anulación de esas ventas no
repone stock (el módulo no inventa).

**Módulo.** `modules/inventario/anulaciones/` con `repositorio.ts` y
`servicio.ts`, expuestos como `revertirStockAnulacion` en la API pública. La
idempotencia es por suma, no por bandera: un consumo está devuelto cuando lo ya
revertido alcanza lo que consumió, y eso lo contesta la suma de sus reversiones.
Una venta anulada dos veces (parcial y luego total) repone cada botella una sola
vez, sin columna que pueda quedar desincronizada.

La ml se devuelve a las botellas de las que salió, empezando por las más vacías
(el orden inverso al del consumo); si a esas ya no les cabe porque su capacidad
cambió tras la venta, se reporta en `ml_no_repuesto` en vez de repartirse en
botellas ajenas. Anular una venta nunca falla por stock descuadrado.

**Consumo.** `consumirStock` ahora graba `venta_id` y la trazabilidad de
unidades. El plan de consumo lleva `ml_consumido` explícito porque la diferencia
con `ml_restante` no dice nada cuando la venta abre una botella cerrada en ese
momento (su `ml_restante` anterior es 0): sin ese dato, la reversión de un shot
servido de una botella recién abierta no devolvía nada. Lo detectó el test de
PostgreSQL, no la revisión.

**Cableado.** `SaleQueries` (anulación total y parcial) llama al módulo dentro
de su propia transacción mediante `conContextoOperacionExistente`, con la
fracción del monto devuelto en el caso parcial. Nueva excepción
`puente-transaccional-heredado|lib/repositories/sale/SaleQueries.ts` (25
vigentes) con su condición de retiro: cuando la transacción de ventas se migre
al contexto opaco en la fase 5.

Sin efectos externos: el stock del bar se lee bajo demanda y la venta ya emite
su `sale_cancelled`.

## Verificación del corte 8

- `pnpm typecheck`: aprobado (0 errores).
- `pnpm lint:full`: 0 errores; 1 warning preexistente (`instrumentation.ts`).
- Prettier: verificado en todos los archivos tocados (prettier no parsea `.sql`,
  que queda fuera del chequeo).
- `pnpm test:unit --maxWorkers=2`: **1723 aprobadas, 2 omitidas** (180
  archivos). Pruebas nuevas en `inventario-dominio.test.ts`: reversión de
  botellas, de ml, fracción parcial, saldo ya devuelto, ml que no cupo, y la
  trazabilidad que graba el consumo (incluida la botella que la venta abre).
- `pnpm test:postgres`: **161 aprobadas en 16 archivos**.
  `anulacion-stock.test.ts` prueba el camino completo contra la base: botellas
  de vuelta, ml repuesto a la botella abierta, parcial + total sin duplicar,
  anulación doble idempotente y venta sin presentación que no inventa stock.
- `pnpm arquitectura:limites`: aprobado; **25 hallazgos / 25 excepciones**, sin
  obsoletas.
- `pnpm db:parity`: la referencia local arrastraba 12 migraciones de retraso
  (048-057) y por eso la puerta ya estaba roja antes de este corte; tras
  actualizarla, las dos rutas de instalación coinciden con la referencia en todo
  lo que agrega la 058. Queda **una diferencia preexistente y ajena**: la FK
  `fk_gratificaciones_solicitante` de la migración 037 difiere en `DEFERRABLE`.
- `pnpm arquitectura`: censo regenerado; `inventario_movimientos` queda con dos
  propietarios (consumo y anulaciones), los dos dentro del módulo.
- `pnpm build`: aprobado.
- No se ejecutaron `pnpm test:integration:*` ni e2e.

## Corte 9: productos y compras al módulo

**Qué faltaba.** El dueño de productos y compras. `ProductRepository` (319
líneas) y `PurchaseRepository` + `PurchaseService` (274 líneas) seguían en la
capa heredada, y ambos entraban al módulo inventario por el puente de
transacción heredado para escribir presentaciones y unidades en su propia
transacción.

**Qué se movió**

- `modules/inventario/productos/` con `repositorio.ts` y `servicio.ts`: SQL de
  `productos` y `producto_champagne_tiers`, el mapeo con `ProductSchema`, la
  búsqueda con acentos, el reordenamiento y el alta y la edición con sus
  presentaciones y unidades. Mismo SQL y mismas reglas: este corte mueve código.
- `modules/inventario/compras/` con `repositorio.ts` y `servicio.ts`: SQL de
  `compras` y `detalle_compras` con su folio por secuencia, y el caso de uso que
  valida el payload, valida la pertenencia de cada presentación, crea la compra,
  genera las unidades, fija el último costo y sincroniza el stock.
- `ProductService` y la ruta `/api/purchases` consumen ahora la API pública del
  módulo. `lib/repositories/ProductRepository.ts`,
  `lib/repositories/PurchaseRepository.ts` y `lib/services/PurchaseService.ts`
  se borraron.

**Lo que cambia de verdad.** El puente transaccional deja de usarse para
productos y compras: dentro del módulo, el alta de un producto llama a
`crearPresentacion` y `generarUnidades` con el mismo `trx`, sin salir del
subdominio. **Las excepciones del puente pasan de tres a una**, y la que queda
es la anulación de ventas, con su condición de retiro ya anotada para la fase 5.

`productosPorIds` vive en el subdominio de productos porque las compras
necesitan validar a qué producto pertenece cada presentación antes de mover
stock: es una consulta de inventario porque la tabla es de inventario.

## Verificación del corte 9

- `pnpm typecheck`: aprobado (0 errores).
- `pnpm lint:full`: 0 errores; 1 warning preexistente (`instrumentation.ts`).
- `pnpm test:unit --maxWorkers=2`: **1723 aprobadas, 2 omitidas** (180
  archivos). `ProductService.test.ts` mockea los productos por la API pública
  del módulo, y el test de compras se movió a
  `tests/unit/modules/compras.test.ts` porque su sujeto ya es el módulo: ahora
  verifica que las presentaciones se validan antes de crear la compra, que el
  total se calcula en servidor y que los códigos generados salen con producto,
  presentación y folio.
- `pnpm test:postgres`: **161 aprobadas en 16 archivos**.
- `pnpm test:integration` y `pnpm test:integration:settings`: en verde.
- `pnpm arquitectura:limites`: **23 hallazgos / 23 excepciones** (22 ciclos + 1
  puente), sin obsoletas.
- `pnpm arquitectura` y `pnpm build`: regenerados con el árbol de este corte.
- `pnpm test:e2e`: **8 aprobadas, 13 omitidas** (las omitidas necesitan
  `TEST_PASSWORD`), con la aplicación de producción servida por el propio
  `webServer` de Playwright.

## Siguientes cortes1. Cerrar la fase 4 queda pendiente de migrar la transacción de ventas al

contexto opaco, que es lo que retira la última excepción del puente. Todo lo
demás de la fase está en el módulo: consumo, reversión, transferencias, envases,
presentaciones, unidades, lecturas, productos y compras. 2. Decidir el destino
de los dos archivos restantes de la capa heredada (`inventoryHelpers.ts` e
`inventoryTypes.ts`): moverlos dentro del módulo o declararlos utils compartidos
con una nota en `MODULOS_Y_DATOS.md`. 3. Actualizar el censo de propietarios
tras cada corte; no cerrar la fase hasta que las escrituras de inventario pasen
por el módulo y los flujos de compras, transferencias, shots y envases estén
cubiertos.
