# Vencimientos en inventario: lote por unidad, bloqueo de venta y baja trazable

Objetivo: que el vencimiento deje de ser sólo información y pase a tener
consecuencias. Hoy el sistema sabe la fecha de cada presentación y la muestra en
el badge, pero lo vencido se sigue vendiendo, no hay forma de sacarlo del
inventario con rastro, y comprar un lote nuevo "renueva" el vencimiento de las
botellas viejas porque `inventario_unidades` no tiene fecha propia.

Rama: `main`. Runner: `corepack pnpm vitest run`.

## Specs

- **S1** — `inventario_unidades` gana `fecha_vencimiento date` (migración 111):
  la fecha del lote al que pertenece esa botella. La escribe la compra, que ya
  guardaba elaboración, duración y vencimiento por línea en `detalle_compras`.
- **S2** — El vencimiento que aplica a una unidad es el de su lote; si no lo
  tiene, el de su presentación
  (`COALESCE(u.fecha_vencimiento, p.fecha_vencimiento)`). La regla es la misma
  en SQL y en TypeScript (`fechaVencimientoUnidad` / `unidadVencida`).
- **S3** — La migración 111 **no** copia la fecha de la presentación en las
  unidades viejas: una copia se congela y después editar la presentación ya no
  las movería. Las unidades sin fecha de lote propio quedan en `NULL` y siguen a
  su presentación, que es el comportamiento de siempre.
- **S4** — Comprar un lote nuevo con vencimiento más largo no toca las botellas
  viejas: cada lote conserva el suyo. Un lote viejo que ya venció sigue vencido
  aunque la presentación haya cambiado.
- **S5** — Lo vencido no se vende. El catálogo del bar (`listarParaVenta`) sólo
  ofrece presentaciones con stock vendible, y el consumo (`consumirStock`,
  `consumirColacion`, `consumirCover`, `consumirProductoCortesia`) aparta del
  grupo las botellas vencidas y avisa con su propio mensaje cuando no queda
  ninguna vigente. "Por vencer" avisa, no bloquea; el día del vencimiento la
  botella todavía se puede vender (misma regla que ya usaba
  `estadoVencimiento`).
- **S6** — Un lote vencido no baja al bar: el traspaso a bodega lo excluye y lo
  dice en el mensaje de stock insuficiente.
- **S7** — Entre las botellas que sí se consumen sale primero la que vence
  antes: el FIFO del traspaso y del consumo pasan a ordenar por
  `fecha_vencimiento ASC NULLS LAST`.
- **S8** — La baja por vencimiento es un caso de uso del módulo inventario
  (`modules/inventario/mermas/`): las unidades vencidas pasan a `inactivo` y
  quedan registradas en `inventario_movimientos` con `tipo = 'merma'`, la
  cantidad, los ml perdidos, el usuario y una nota. Cada botella dada de baja
  queda anotada en `inventario_movimiento_unidades`.
- **S9** — La UI tiene un panel de lotes vencidos (`/products/expired`, con
  enlace en Bodega) que lista las presentaciones con stock vencido y da de baja
  el lote con confirmación.
- **S10** — La reposición no cuenta el stock vencido (no se puede vender) pero
  lo reporta en `unidades_vencidas` para que se le dé de baja.
- **S11** — `productos.fecha_vencimiento` se deriva primero del stock con fecha
  (`MIN` de las unidades activas) y, si no hay, de las presentaciones. Al dar de
  baja un lote vencido, el producto pasa a avisar por el lote siguiente.

Fuera de alcance: el aviso preventivo de "vence en X días" como acción masiva
(la base ya está: el FIFO por vencimiento y el panel), y el registro de
vencimientos por lote completo (`inventario_lotes`), que es más caro de lo que
el caso necesita.

## Tasks

| ID  | Specs   | Ruta   | Riesgo                                      | Commit                                           |
| --- | ------- | ------ | ------------------------------------------- | ------------------------------------------------ |
| T1  | S1-S4   | inline | item 1 (migración + propagación del lote)   | `feat(inventario): vencimiento por unidad`       |
| T2  | S5-S7   | inline | item 2 (bloqueo de venta y FIFO)            | `feat(bar): no vender lotes vencidos`            |
| T3  | S8      | inline | item 3 (baja trazable + API)                | `feat(inventario): baja de lotes vencidos`       |
| T4  | S9      | inline | item 4 (panel de vencidos)                  | `feat(productos): panel de lotes vencidos`       |
| T5  | S10-S11 | inline | item 5 (reposición y derivado del producto) | `feat(inventario): reposición sin stock vencido` |

Verificación:
`corepack pnpm vitest run tests/unit/modules/inventario-vencimientos.test.ts tests/unit/modules/compras.test.ts tests/unit/lib/business/vencimiento.test.ts`
y `corepack pnpm typecheck` + `corepack pnpm lint:full` +
`corepack pnpm arquitectura:limites`.

## Log

- **L1** (2026-10-31) — "en el dashboard en el modulo inventario que recomiendas
  hacer con los productos (presentaciones) ya vencidas". El diagnóstico: el
  vencimiento era sólo una etiqueta. Cuatro huecos: lo vencido se seguía
  vendiendo (`listarParaVenta` y todo `modules/inventario/bar/` ignoraban la
  fecha), no había salida trazable (la baja existía en API pero sin UI y sin
  movimiento), el vencimiento no llegaba a la unidad (comprar un lote nuevo
  "renovaba" el viejo) y la reposición compraba producto invendible.
- **L2** (2026-10-31) — "que pasa si compro nuevo producto (presentacion con
  fecha de vencimiento mas largo) que pasa con los que tienen fecha de
  vencimiento corto o ya por vencer". La respuesta cerró el modelo: con fecha
  por unidad, cada lote conserva el suyo, los que están por vencer salen primero
  por FIFO y los vencidos se bloquean y se dan de baja sin arrastrar al lote
  nuevo.
- **L3** (2026-10-31) — Decisión de diseño: la fecha de la presentación sigue
  siendo editable y es la referencia del stock sin lote propio; la fecha de la
  unidad sólo la escribe la compra, que es el único sitio donde existe el dato
  real del lote. Por eso el alta manual y el stock inicial del alta de producto
  dejan la unidad en `NULL` en vez de copiar la fecha de la presentación: una
  copia se congela y rompería el flujo de editar la fecha del producto.
- **L4** (2026-10-31) — T1 cerrada: migración 111 (columna `fecha_vencimiento`
  - `nota` en movimientos + índice), `generarUnidades` acepta el vencimiento del
    lote y la compra se lo pasa, `fechaVencimientoUnidad`/`unidadVencida` como
    helpers puros. Evidencia: `pnpm typecheck` ✓, `pnpm lint:full` ✓ (0 errores,
    avisos preexistentes), `pnpm arquitectura:limites` ✓,
    `pnpm vitest run tests/unit/modules/compras.test.ts` ✓ 11/11,
    `pnpm vitest run tests/unit/lib/business/vencimiento.test.ts` ✓ 23/23.
    `pnpm db:verify` **no se pudo correr**: no hay Postgres escuchando en
    `127.0.0.1:5433` en esta máquina, así que el drill de migraciones queda
    pendiente para CI.
- **L5** (2026-10-31) — La migración 111 se quedó **sin backfill** a propósito:
  la primera versión copiaba la fecha de la presentación en las unidades viejas,
  y esa copia se congela (editar la fecha del producto ya no movería esas
  botellas). Con el backfill fuera, las unidades sin lote propio quedan en
  `NULL` y siguen a su presentación, que es el comportamiento de siempre, y la
  fecha de la unidad la escribe sólo la compra, que es el único sitio donde
  existe el dato real del lote.
- **L6** (2026-10-31) — T2 cerrada: el catálogo del bar filtra por vencimiento
  (`COALESCE(u.fecha_vencimiento, p.fecha_vencimiento) >= ?` con el día del
  negocio como parámetro), el consumo aparta las botellas vencidas y avisa con
  su propio mensaje, el cover y la cortesía no entregan lotes vencidos, y el
  traspaso a bodega no baja lo vencido (lo dice en el mensaje de stock
  insuficiente). El FIFO del consumo y del traspaso pasa a ordenar por
  vencimiento, así sale primero lo que más se está por vencer.
- **L7** (2026-10-31) — T3 cerrada: `modules/inventario/mermas/` (repositorio +
  servicio), `GET/POST /api/products/expired` y el movimiento `merma` con nota,
  usuario y ml perdidos. `sincronizarVencimientoProducto` ahora deriva del stock
  con fecha antes que de las presentaciones, así que al dar de baja un lote
  vencido el producto pasa a avisar por el lote siguiente.
- **L8** (2026-10-31) — T4 cerrada: panel `/products/expired` con la lista de
  lotes vencidos y la baja con confirmación, con enlace desde Bodega.
- **L9** (2026-10-31) — T5 cerrada: la reposición no cuenta el stock vencido y
  lo reporta en `unidades_vencidas`; el histórico del bar rotula la merma.
- **L10** (2026-10-31) — Verificación final: `pnpm typecheck` ✓,
  `pnpm lint:full` ✓ (0 errores, 26 avisos preexistentes),
  `pnpm arquitectura:limites` ✓ (0 hallazgos), `pnpm check:use-client` ✓,
  `pnpm build` ✓ (registra `/api/products/expired` y `/products/expired`),
  `pnpm test:unit` ✓ **3256/3259** — los 3 fallos restantes son de
  `tests/unit/lib/biometric/*` (identificacionFacial, verificacionFacial) por el
  trabajo en curso de reconocimiento facial que hay en el árbol, los mismos que
  ya estaban documentados en L5 de `fechas-lote-por-presentacion.md`; nada de
  este cambio toca esa área. `pnpm db:verify` **no se pudo correr**: no hay
  Postgres escuchando en `127.0.0.1:5433` en esta máquina, así que el drill de
  migraciones (y el de `inventario_unidades.fecha_vencimiento`) queda pendiente
  para CI.
- **L11** (2026-10-31) — El guard de la UI usa `products.edit` y no
  `products.write`: la capa de rutas usa la matriz de flags (`read`/`write`/
  `delete`) y la capa de UI usa el catálogo de permisos (`view`/`create`/
  `edit`/…), y `products.write` no existe en el catálogo. El guard quedó en
  `edit`, que es lo que corresponde a "dar de baja stock".
