# Optimización de inventario: comparación antes y después

Fecha: 15/10/2026. Continuación de
[la medición inicial](registro-2026-10-15.md).

## Cambio aplicado

La validación de venta ya hacía `SELECT … ORDER BY id FOR UPDATE` de las
presentaciones principales. Ahora esa misma consulta devuelve también sus datos
de consumo. El consumo reutiliza esos datos para botellas completas dentro de la
misma transacción: elimina una lectura redundante por presentación, sin
adelantar bloqueos de otras filas ni mover las escrituras.

La validación completa sigue ocurriendo antes de calcular los pedidos y leer la
configuración de shots. Después se mantiene el orden estable por presentación,
la selección bloqueada y ordenada de unidades, los descuentos, el movimiento y
su trazabilidad. La caja y el COMMIT permanecen en sus fases anteriores.

Los datos de `inventario_presentaciones` están protegidos por el bloqueo
inicial. Los mililitros de shot pertenecen a `productos` y no tienen esa
protección: por eso no se almacenan anticipadamente y se conserva la lectura
original para shots. El producto incluido de servicios y los acompañamientos que
no estén ya bloqueados mantienen su consulta original. No se introduce caché
entre solicitudes.

La migración `074_indice_stock_bar_presentacion.sql` añade un índice parcial no
único por `presentacion_id`, limitado a unidades activas en el bar
(`estado = 'almacen' AND ubicacion = 'bar'`). El filtro, el ORDER BY y el FOR
UPDATE del consumo permanecen intactos. El esquema de instalaciones nuevas
incluye el mismo índice. Se aplicó con el runner habitual únicamente en la base
local.

## Comparación de los casos de uso

Tres ejecuciones con el mismo arnés: antes de cambios; reutilización sin índice;
reutilización con índice. Cada ejecución realizó 100 operaciones medidas en
serie (20 por caso), 80 concurrentes (cinco tandas de cuatro por caso), cinco
pruebas de bloqueo provocado y diez calentamientos. La última se ejecutó después
de terminar la suite, sin ella en paralelo. Las tres partieron de los mismos
conteos: 681 unidades, 62 presentaciones, 18 ventas, 4 servicios y 4 cajas. Se
conservan la caché real y las simulaciones de transportes externos del benchmark
inicial.

| Caso en serie         | Consultas antes → final | p50 antes ms | p50 solo reutilización ms | p50 final ms | p95 antes ms | p95 final ms |
| --------------------- | ----------------------: | -----------: | ------------------------: | -----------: | -----------: | -----------: |
| venta_bar_1           |                 17 → 16 |        22,71 |                     20,94 |        21,14 |        28,48 |        23,67 |
| venta_mixta_1         |                 21 → 20 |        21,49 |                     19,84 |        19,43 |        29,89 |        23,92 |
| venta_bar_10          |                 62 → 52 |        63,27 |                     54,86 |        50,26 |        72,76 |        57,23 |
| servicio_VIP          |                 25 → 25 |        26,04 |                     26,81 |        26,38 |        31,62 |        27,80 |
| servicio_sin_producto |                 20 → 20 |        21,35 |                     21,62 |        20,88 |        25,93 |        26,93 |

La venta de diez presentaciones reduce diez consultas (16,1 %) y su mediana baja
de 63,27 a 50,26 ms (20,6 % en esta ejecución). La oportunidad se concentra en
ventas de botellas: shots e incluidos no eliminan lecturas. En el servicio VIP
no hay mejora apreciable de mediana de extremo a extremo, aunque su SELECT de
stock usa el nuevo índice. No se interpreta una diferencia pequeña como ganancia
estable.

En el plan real de venta simple, la selección de unidades pasó de
`LockRows → Sort → Seq Scan` (245 bloques compartidos tocados, 0,441 ms de
ejecución del servidor) a `LockRows → Sort → Index Scan` (9 bloques, 0,089 ms).
En VIP pasó de 0,485 a 0,110 ms. Son EXPLAIN individuales, realizados tras el
commit y antes de limpiar el fixture; no son percentiles ni tiempos completos de
la solicitud.

### Concurrencia natural

| Caso compartido           | p50 antes ms | p50 final ms | p95 antes ms | p95 final ms | Operaciones con espera antes → final / 20 |
| ------------------------- | -----------: | -----------: | -----------: | -----------: | ----------------------------------------: |
| caja_compartida           |        39,57 |        41,68 |       115,84 |       107,86 |                                   14 → 12 |
| inventario_compartido     |        36,68 |        37,87 |        55,55 |        71,02 |                                   15 → 15 |
| cliente_compartido        |        46,04 |        40,40 |        80,38 |        72,00 |                                   15 → 15 |
| servicios_caja_compartida |        48,57 |        52,59 |        57,44 |        58,95 |                                     7 → 8 |

**No hay evidencia de una mejora consistente bajo contención.** El p95 de
inventario compartido subió de 55,55 a 71,02 ms; la ejecución intermedia también
dio 75,58 ms. La mediana final de ese caso quedó cerca de la inicial. Caja y
servicios compartidos también muestran variación. Con veinte muestras por caso
no se puede atribuir cada diferencia al cambio ni asegurar una mejora de colas;
falta una carga más larga y representativa para establecerlo. Se publican las
tres ejecuciones completas, sin descartar resultados desfavorables.

Las cinco pruebas de bloqueo provocado detectaron espera y terminaron
correctamente en todas las variantes. Su retención artificial de 120 ms no se
mezcla con los percentiles naturales. Las muestras de pg_stat_activity
identifican sentencias bloqueadas, pero no miden exactamente cuánto duró cada
espera; el intervalo solicitado de 5 ms depende de la planificación del proceso.
Los bloqueos necesarios se conservan.

Los percentiles y medianas se refieren a los casos de uso locales, con
conexiones calientes; no incluyen HTTP, autenticación ni renderizado. La carga
pequeña, la actividad del sistema, el historial físico de las tablas, autovacuum
y el registro de todas las sentencias limitan la comparación. No se hizo una
prueba estadística ni se fijó una garantía de rendimiento de producción.

Evidencia completa: [antes](inventario-antes-2026-10-15.json),
[solo reutilización](inventario-reutilizacion-2026-10-15.json),
[reutilización e índice](inventario-despues-2026-10-15.json).

## Evaluación aislada del índice

Se comparó el SELECT original sobre una tabla temporal que copia las columnas
relevantes del stock local y sobre otra distribución temporal con 100.000
unidades y diez unidades por presentación. Cada variante tuvo dos calentamientos
y veinte EXPLAIN ANALYZE. Se contrastó el hash del resultado completo, incluido
el orden y `ml_restante`: fue idéntico antes y después.

| Distribución temporal       | Unidades devueltas | Mediana sin índice | Mediana con índice |
| --------------------------- | -----------------: | -----------------: | -----------------: |
| Copia local                 |                 17 |           0,172 ms |           0,106 ms |
| Sintética, 100.000 unidades |                 10 |          13,703 ms |           0,088 ms |

Son tiempos de ejecución del servidor para ese SELECT, no latencia del caso de
uso. La copia temporal no reproduce todos los índices, la anchura completa de la
tabla ni su historial físico; sirve para aislar el candidato y no permite
extrapolar porcentajes a producción. El índice añade mantenimiento en altas,
traslados y ventas; su coste de escritura queda incluido en el benchmark
completo posterior, pero no se aisló por separado.

Se eligió el índice simple para evitar el escaneo por presentación sin añadir
claves de orden más anchas. Se conserva el ordenamiento explícito y el bloqueo
de todas las unidades candidatas: no se agregaron LIMIT ni SKIP LOCKED.

Evidencia:
[planes del índice temporal](inventario-indice-temporal-2026-10-15.json).

## Reproducción

```powershell
# Casos de uso completos, con PostgreSQL y caché locales
$env:REGISTRO_BENCH_OUTPUT='docs/rendimiento/inventario-despues-2026-10-15.json'
corepack pnpm exec vitest run --config vitest.registro-benchmark.config.ts

# Comparación aislada; DDL y escrituras solo en pg_temp
node scripts/benchmark-indice-inventario.mjs
```

La migración utiliza CREATE INDEX transaccional, según el runner existente. Su
aplicación en una base grande requiere una ventana adecuada porque puede
bloquear escrituras durante la construcción; esta tarea no desplegó cambios en
producción.

## Validación

- Suite unitaria completa: 310 archivos aprobados y 2 omitidos; 2.432 pruebas
  aprobadas y 2 omitidas, salida 0.
- PostgreSQL: 34 pruebas distintas aprobadas entre las dos tandas, que cubren
  ventas, shots, botellas, anulaciones, creación de servicios, producto incluido
  y prepago. Las cuatro pruebas nuevas de optimización se repitieron tras
  reforzar la comprobación de la sentencia bloqueada y pasaron.
- Pruebas nuevas: reutilización sin mover fases de escritura; mantenimiento de
  la lectura de shots e incluidos; dos consumos concurrentes de una única unidad
  sin sobreventa; rollback tras error SQL posterior al consumo; rollback al
  faltar stock en una presentación posterior; trazabilidad exacta de unidades/ml
  y lectura actualizada de ml del producto en su fase original.
- Tres benchmarks completos aprobados, sin errores del observador; comparación
  temporal del índice con resultado ordenado idéntico.
- TypeScript, ESLint, Prettier, diff sin errores de espacios y control de
  dependencias entre módulos aprobados.
- Migración 074 aplicada en la base local, definición del índice comprobada y
  plan posterior sin migraciones pendientes. No se modificó el historial previo.

Los datos temporales se limpiaron al finalizar. Se conservaron los cambios
locales anteriores de prepago, ventas y servicios. No se desplegó en producción.
