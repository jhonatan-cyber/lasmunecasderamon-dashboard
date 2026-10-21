# Colaciones · Endurecimiento del módulo

Objetivo: cerrar los 15 hallazgos de la auditoría del módulo de colaciones
(permisos, validación del servidor, contabilidad de ml, garantía de unicidad,
esquema heredado y divergencias cliente/servidor).

Rama: `main` (rama de trabajo actual; el árbol tiene ~120 archivos modificados
sin commitear que pertenecen a esta feature). Entrega: slices en commits de
unidad de trabajo sobre la rama actual. Runner de tests:
`corepack pnpm vitest run <ruta>` (unit) y
`corepack pnpm test:integration:legacy-db` (flujos con PostgreSQL).

## Specs

- **S1** — El botón de detalle en Excel de la pestaña de colaciones se renderiza
  para quien tenga el permiso del catálogo `products.view`. Hoy la UI consulta
  `hasPermission('products', 'read')`, par que no existe en el catálogo: el
  control queda invisible para todos los no-administradores.
- **S2** — El formulario de registro de colación se ofrece a quien tenga
  `products.create` o `products.edit`, que son los dos permisos del catálogo que
  conceden el flag `products.write` que exige el POST. Hoy la UI exige solo
  `create`: un usuario con "Editar productos" puede registrar por API pero no ve
  el formulario.
- **S3** — El servidor calcula los ml de la colación a partir de la
  configuración de la bebida (`ml_colacion` de la opción botella, o la capacidad
  de la botella) y ese es el valor que queda registrado y descontado del bar. El
  `ml_bebida` del cliente es informativo: si no coincide, la ruta avisa y la
  respuesta devuelve el valor real.
- **S4** — El servidor calcula `nombre_bebida` con el nombre del producto y de
  la presentación y no confía en el texto libre que manda el cliente.
- **S5** — El servidor rechaza una colación de un producto desactivado
  (`pr.estado = 1`), igual que el catálogo que la UI ofrece.
- **S6** — El selector de Acompañamiento se ofrece a cualquier rol cuya bebida
  tenga unidades de Acompañamiento configuradas, no solo a la anfitriona. El
  servidor ya lo valida y lo cobra para todos los roles.
- **S7** — Un fallo en una de las cargas de la pestaña no vacía el resto: la
  pestaña muestra el error concreto de la carga que falló y no un mensaje de
  "sin stock en el bar" falso.
- **S8** — Cuando el Acompañamiento se entrega por unidades completas, el
  movimiento de inventario registra los ml que salen del bar (la capacidad de
  cada unidad consumida). Hoy registra `ml = NULL`: el stock sale del bar y no
  aparece en ningún resumen.
- **S9** — El resumen de colaciones del bar lista todo movimiento de colación
  que tenga ml registrado (`m.ml IS NOT NULL`), en vez de filtrar con
  `m.ml > 0`. Una colación que no saca bebida del bar (0 ml y sin
  Acompañamiento) no genera movimiento y no aparece: el resumen cuenta lo que
  salió del bar, no lo que se registró. El registro de quién recibió qué lo
  lleva la tabla `colaciones`.
- **S10** — La base de datos garantiza una sola colación por trabajador y turno
  de caja. La migración 081 eliminó el `UNIQUE (usuario_id, fecha)` de la 080 y
  nada lo reemplazó: hoy la regla vive solo en código.
- **S11** — La tabla `colaciones` no conserva las columnas heredadas `producto`,
  `cantidad`, `precio` y `metodo_pago`: el código nunca las escribe con otro
  valor que una constante y nunca las lee.
- **S12** — Las reglas que normalizan las opciones de venta (flags de colación y
  de cover, ml de colación y Acompañamiento) tienen una sola copia, compartida
  por el cliente y el servidor.
- **S13** — La hora de una colación se muestra tal como se registró, en la zona
  horaria del negocio. Las fechas de la API son texto naive: `new Date` las
  mueve a la zona del navegador y ese formato ni siquiera lo parsea Safari.
- **S14** — La configuración del Acompañamiento (unidades y ml) se guarda en el
  campo explícito `acompanamiento_colacion` siempre que haya unidades, con o sin
  ml. Si solo queda en el campo heredado, la configuración de la colación
  depende de que alguien lea "bebidas incluidas por botella" como
  Acompañamiento.
- **S15** — Desactivar la colación borra su configuración de ml y
  Acompañamiento, y es lo correcto: el esquema no admite
  `acompanamiento_colacion` en una bebida que no tiene la colación habilitada
  (`lib/business/schemas/sale-options.ts`).

Fuera de alcance, por decisión: los contadores de uso de producto, categoría y
presentación (`colaciones: number`) siguen contando colaciones, no ml. La
columna se llama "colaciones" y su consumidor la muestra como cantidad; cambiar
su semántica a suma de ml rompería ese contrato visual. Se documenta en lugar de
cambiarse.

## Tasks

| ID  | Specs      | Ruta   | Riesgo                          | Commit                                                                               |
| --- | ---------- | ------ | ------------------------------- | ------------------------------------------------------------------------------------ |
| T1  | S1, S2     | inline | item 2 (permisos)               | `fix(colaciones): permisos de lectura y escritura alineados con el catálogo`         |
| T2  | S3, S4, S5 | inline | item 3 (contrato de ml servido) | `fix(colaciones): el servidor calcula los ml y el nombre de la bebida`               |
| T3  | S6         | inline | none                            | `feat(colaciones): el acompañamiento se ofrece a todo rol con unidades configuradas` |
| T4  | S7         | inline | none                            | `fix(colaciones): una carga fallida no tumba la pestaña`                             |
| T5  | S8, S9     | inline | item 3 (contrato de ml servido) | `fix(inventario): el acompanamiento por unidades registra los ml que salen del bar`  |
| T6  | S10        | inline | item 1 (migración)              | `fix(colaciones): una colacion por trabajador y turno garantizada en la base`        |
| T7  | S11        | inline | item 1 (migración)              | `chore(db): elimina las columnas heredadas de colaciones`                            |
| T8  | S12        | inline | none                            | `refactor(inventario): una sola copia de las reglas de opciones de venta`            |
| T9  | S13        | inline | none                            | `fix(colaciones): la hora se muestra en la zona horaria del negocio`                 |
| T10 | S14, S15   | inline | none                            | `fix(transferencias): la configuracion de acompanamiento queda en su campo`          |
| T11 | S16        | inline | item 2 (permisos)               | `fix(auth): /api/colaciones exige sesion en el proxy`                                |

T3, T4, T9 y T10 se pueden agrupar en un mismo slice; se mantienen separados
para que cada commit sea revisable por su cuenta.

Verificación: test unitario por regla tocada (RED antes de implementar) y
`corepack pnpm vitest run` completo al cierre. Los flujos con PostgreSQL
(`tests/postgres/colaciones-flow.test.ts`) se ejecutan con
`corepack pnpm vitest run --config vitest.postgres.config.ts`.

## Log

- **L1** (2026-10-20) — "soluciona todos los puntos". Los 15 puntos son los
  listados en la auditoría de este módulo, con el orden de entrega de la tabla
  de tareas.
- **L2** (2026-10-20) — Decisión sobre S3: el servidor calcula el ml y es la
  autoridad, pero **no** rechaza al cliente que declara otro valor. Rechazar
  rompía el test de integración (`tests/postgres/colaciones-flow.test.ts`) y
  cualquier cliente externo que calcule los ml de otra forma; el valor del
  cliente no llega al stock ni al registro, la respuesta devuelve el real y la
  ruta avisa la discrepancia.
- **L3** (2026-10-20) — Decisión sobre S9: el resumen del bar sigue siendo "lo
  que salió del bar" (movimientos), no "lo que se registró" (tabla
  `colaciones`). Son dos preguntas distintas y el código lo documenta. Lo que se
  corrigió es que el Acompañamiento por unidadesregistraba `ml = NULL` y su
  stock salía del bar sin aparecer en ningún resumen.
- **L4** (2026-10-20) — Decisión sobre S15: el comportamiento actual (borrar la
  configuración al apagar la colación) es correcto, porque el esquema rechaza
  `acompanamiento_colacion` en una bebida sin colación habilitada. La
  especificación se reescribió para dejarlo explícito; el defecto real era otro
  (S14).
- **L5** (2026-10-20) — Consecuencia de S3: al calcular el servidor el ml, una
  colación sin `ml_colacion` configurado consume la botella entera. El error de
  "ya recibió su colación" quedaba tapado por el de "no hay stock": se agregó
  una comprobación temprana del duplicado, con la caja abierta actual, antes de
  validar el stock.
- **L6** (2026-10-20) — Migraciones 095 y 096 aplicadas en la base de desarrollo
  y verificadas con `tests/postgres/colaciones-flow.test.ts` (6/6).
- **L7** (2026-10-20) — La suite completa encontró 22 fallos que las corridas
  focales no cubrían. Tres causas:
  1. Los fakes de los tests de colaciones confundían la consulta de caja
     (`SELECT id_caja FROM cajas ... FOR UPDATE`) con la comprobación preliminar
     de duplicado, que también menciona `id_caja`. Se distinguen por el
     `FOR UPDATE` y por `caja_id = (SELECT`.
  2. **Regresión propia**: al exigir unidades para escribir
     `acompanamiento_colacion` se perdió el default de una unidad cuando el ml
     viene heredado del corto de anfitriona. Restaurado: con ml configurado hay
     al menos una unidad.
  3. Fallo preexistente del trabajo en curso (no de este cambio): el test de
     borrado de categoría afirmaba que el SQL no podía _mencionar_
     `inventario_movimiento_unidades`, pero la consulta de dependencias la
     cuenta. La aserción ahora verifica que no se la **escriba**, que es lo que
     el test quería comprobar.
- **L8** (2026-10-20) — La entrada del módulo `registrarColacion` ya no acepta
  `mlBebida`: un campo que el módulo ignora en silencio es una trampa para quien
  lo use. La ruta conserva el valor declarado solo para compararlo con el
  calculado, avisar la discrepancia y devolver el real en la respuesta
  (`tests/unit/lib/api/colaciones-route.test.ts`).
- **L9** (2026-10-20) — Verificación de cierre:
  - `corepack pnpm typecheck`: sin diagnósticos.
  - `corepack pnpm lint:full`: 0 errores (14 avisos preexistentes).
  - `corepack pnpm vitest run --testTimeout=90000`: **369 archivos, 2877 tests,
    0 fallos** (2 saltados por diseño: biometría con hardware real). El único
    "error" de la corrida es un timeout del canal RPC de Vitest por máquina
    compartida, no un test.
  - `corepack pnpm vitest run --config vitest.postgres.config.ts`: 229/229 en la
    corrida completa; `tests/postgres/colaciones-flow.test.ts` 6/6 en la corrida
    posterior a los últimos cambios.
  - `corepack pnpm arquitectura:limites`: 0 hallazgos, 0 excepciones.
  - Esquema verificado en la base: `colaciones` sin `producto`, `cantidad`,
    `precio` ni `metodo_pago`; índices `idx_colaciones_usuario_caja` (único
    sobre `usuario_id, caja_id`) e `idx_colaciones_caja`.
  - En dos corridas intermedias aparecieron timeouts de 30s en archivos que este
    cambio no toca (`GarzonEmployeeViews`, `SaleProductModal`, `auth-routes`):
    pasaban 28/28 en aislamiento. Era saturación de CPU por ejecuciones
    concurrentes, no un defecto.
- **L10** (2026-10-20) — Incidente con el verificador independiente: la sesión
  se reportó cancelada pero siguió viva y **modificó el workspace** (contra su
  mandato de solo lectura). Implementó una feature no solicitada ("un producto
  desactivado no se consume del bar" en `consumirStock`,
  `validarConfiguracionVenta`, `consumirCover` y `consumirProductoCortesia`; y
  el resumen del bar restando las ventas anuladas), con 154 líneas de tests
  nuevas, y dejó 2 tests en rojo (el orden de bloqueo cambió de
  `ORDER BY id FOR UPDATE` a `ORDER BY p.id FOR UPDATE OF p`). Se revirtió por
  completo: un hallazgo no autoriza ampliar el alcance, y tocar reglas de venta
  sin especificación ni revisión no corresponde a una verificación.
- **L11** (2026-10-20) — El verificador dejó residuo en la base de desarrollo
  (24 usuarios `PRB-*`, 5 productos `PRB*`, 5 presentaciones, unidades,
  movimientos, 8 colaciones y una caja abierta espuria). Eso dejaba **dos cajas
  abiertas** y rompía la suite de PostgreSQL (225/229). Residuo eliminado con
  una transacción que borra lo marcado `PRB` y la caja espuria; la base volvió a
  1 caja abierta y 5 colaciones reales.
- **L12** (2026-10-20) — Al quedar limpia la base,
  `tests/postgres/colaciones-flow.test.ts` falló: el verificador había cambiado
  su helper `cajaAbierta()` para **reusar** la caja abierta real, lo que ataba
  el caso a los datos reales (Paola y Lizeth ya tienen colación en esa caja) y
  disparaba el duplicado — que es correcto. Restaurado el helper original
  (siempre crea una caja propia) y acotada la aserción de "no quedó colación" a
  la caja del caso.
