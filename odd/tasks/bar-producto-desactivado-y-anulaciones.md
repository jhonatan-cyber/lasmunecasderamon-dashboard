# Bar · Producto desactivado y ventas anuladas

Objetivo: dos reglas que el bar no tenía. Un producto desactivado por el usuario
no debe seguir saliendo del bar, y una venta anulada no debe seguir contando
como servida.

Rama: `main`. Runner: `corepack pnpm vitest run` y
`corepack pnpm vitest run --config vitest.postgres.config.ts`.

## Specs

- **S1** — Un producto desactivado (`productos.estado = 0`) no se consume del
  bar: ni en la venta por corto, ni en la venta por botella, ni en el cover de
  una entrada, ni en el servicio de cortesía. La venta se rechaza con un mensaje
  claro y **no** descuenta stock ni registra movimientos.
- **S2** — La comprobación ocurre donde ya se bloquea la presentación, sin
  cambiar **qué** filas se bloquean ni **en qué orden**: el bloqueo sigue siendo
  sobre `inventario_presentaciones`, en orden de id, y solo esas.
- **S3** — El resumen del bar descuenta los ml que una anulación devolvió: los
  ml servidos hoy son los ml vendidos hoy menos los ml repuestos hoy por ventas
  anuladas.
- **S4** — La anulación de una venta de **ayer** no baja los ml de hoy: la venta
  de ayer no contaba para hoy y su devolución tampoco tiene que restar.

Fuera de alcance: el estado del producto en la categoría
(`desactivado_por_categoria`, migración 092), que es un mecanismo distinto de la
desactivación manual.

## Tasks

| ID  | Specs  | Ruta   | Riesgo                                       | Commit                                                      |
| --- | ------ | ------ | -------------------------------------------- | ----------------------------------------------------------- |
| T1  | S1, S2 | inline | item 3 (regla de consumo que otros consumen) | `feat(bar): un producto desactivado no se consume del bar`  |
| T2  | S3, S4 | inline | item 3 (contrato del resumen del bar)        | `fix(bar): el resumen descuenta las ventas anuladas de hoy` |

Verificación: test unitario de las rutas de consumo con el producto desactivado,
test de PostgreSQL del resumen con una venta anulada de hoy y otra de ayer, y la
suite completa de inventario.

## Log

- **L1** (2026-10-20) — "soluciona ambos". Este tema es la feature que un
  verificador implementó por su cuenta y quedó revertida: ahora se hace con
  especificación, pruebas y revisión.
- **L2** (2026-10-20) — La versión previa del verificador cambiaba el SQL de
  bloqueo y dejaba dos tests en rojo por la cadena del `ORDER BY`. Aquí el
  bloqueo se mantiene sobre las mismas filas y en el mismo orden, y los tests
  que lo vigilan se actualizan con su intención (orden determinista y bloqueo
  solo de la presentación).
- **L3** (2026-10-20) — La regla se aplica en los cuatro caminos que sacan
  bebida del bar: `consumirStock` (corto y botella), `consumirCover`,
  `consumirProductoCortesia` y la validación por lote que precede a la venta. La
  colación no se toca: registra lo que salió del bar, no sells productos.
- **L4** (2026-10-20) — El bloqueo **no cambia**: sigue siendo sobre
  `inventario_presentaciones`, en orden de id, y solo sobre esas filas. Para
  leer el estado del producto hace falta tocar la tabla `productos`, y un `JOIN`
  obligaba a cambiar el `FROM` y el `FOR UPDATE`. Se resolvió con una
  **subconsulta correlacionada**: el `FROM` y el `FOR UPDATE` quedan byte a byte
  como estaban, así que la garantía de concurrencia está probada por
  construcción y no por argumento.
- **L5** (2026-10-20) — Con la subconsulta, dos fakes que discriminaban
  consultas por texto SQL dejaron de distinguirlas: usaban
  `!sql.includes('FROM productos')` como proxy de "esta es la validación por
  lote", y la subconsulta también menciona `productos`. Se actualizaron para
  distinguir por la **forma** de la consulta (`WHERE p.id = ?` para la lectura
  individual, `ORDER BY id FOR UPDATE` para la validación por lote), que es lo
  que de verdad las diferencia. Los dos tests que vigilaban el SQL de bloqueo no
  necesitaron cambios: la consulta sigue conteniendo `ORDER BY id FOR UPDATE`.
- **L6** (2026-10-20) — El test del producto desactivado se validó desactivando
  la regla a propósito: 3 de sus 5 casos se ponen rojos. Con la regla activa,
  5/5.
- **L7** (2026-10-20) — El resumen descuenta la devolución con la condición
  `o.tipo = 'venta' AND o.fecha_crea >= inicioDia`: la anulación de una venta de
  ayer no resta porque esa venta no contaba para hoy.
