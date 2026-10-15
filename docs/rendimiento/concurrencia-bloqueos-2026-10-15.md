# Concurrencia y esperas por bloqueos — 15/10/2026

Continuación de
[la optimización de inventario](inventario-optimizacion-2026-10-15.md).

## Resultados combinados

Cada celda reúne dos ejecuciones y 800 solicitudes por variante y escenario. B
menos A negativo significa un p95 menor.

| Escenario compartido    | p50 A ms | p50 B ms | p95 A ms | p95 B ms | Cambio p95 | IC descriptivo 95 % de B−A ms |
| ----------------------- | -------: | -------: | -------: | -------: | ---------: | ----------------------------: |
| Ventas / caja           |    30,18 |    27,18 |    39,58 |    35,04 |   -11,47 % |                [-9,73; -1,55] |
| Ventas / inventario     |    34,05 |    31,12 |    47,72 |    44,99 |    -5,71 % |                 [-5,84; 0,64] |
| Ventas mixtas / cliente |    49,59 |    47,10 |    75,32 |    69,50 |    -7,72 % |                [-8,58; -1,49] |
| Servicios / caja        |    36,89 |    33,91 |    54,26 |    43,73 |   -19,40 % |               [-20,25; -2,03] |

La dirección de mejora se repitió en caja de ventas, cliente compartido y
servicios. En inventario, la segunda B tuvo 47,68 ms de p95 frente a 46,77 ms de
la segunda A: no hay una mejora estable demostrada en ese escenario. El
intervalo combinado también cruza cero. El cliente compartido sigue siendo el
mayor limitante, porque su saldo requiere serialización.

### Ventanas posteriores a adquirir el recurso

El comienzo se mide al recibir la respuesta del SELECT FOR UPDATE o UPDATE de
caja y el final al recibir COMMIT. Los valores no incluyen la espera previa ni
todo el tiempo real retenido dentro del servidor. Son descriptivos; no se
calcularon intervalos para estas ventanas.

| Recurso por escenario   | Mediana A → B ms |  p95 A → B ms | p95 de la sentencia del recurso A → B ms |
| ----------------------- | ---------------: | ------------: | ---------------------------------------: |
| Ventas / caja           |      1,82 → 1,50 |   3,35 → 2,61 |                              8,70 → 7,92 |
| Ventas / inventario     |      7,34 → 6,91 |   9,49 → 9,09 |                            25,46 → 24,17 |
| Ventas mixtas / cliente |    15,64 → 15,12 | 20,44 → 20,33 |                            52,34 → 50,56 |
| Servicios / caja        |      0,75 → 0,75 |   1,90 → 2,01 |                              5,07 → 5,00 |

La ventana mediana de caja en ventas pasó de 1,82 a 1,50 ms; la de cliente, de
15,64 a 15,12 ms. La cola sigue siendo necesaria. En servicios, la ventana de
caja quedó prácticamente igual: la mejora total de esa operación no equivale a
diez milisegundos menos de bloqueo de caja. Parte del ahorro ocurre antes,
durante otros bloqueos y en trabajo del proceso; esta medición no descompone
causalmente todo el delta de extremo a extremo.

El coste mediano total de formato por solicitud pasó de aproximadamente
0,66–0,67 ms a 0,10–0,11 ms según el escenario. El logging se mantuvo activo. El
retraso del monitor no cayó de forma uniforme, por lo que no se afirma que toda
variación del proceso Node haya desaparecido. El p95 de adquisición de conexión
quedó por debajo de 0,08 ms en ambas variantes: no hay señal de saturación del
pool con cuatro solicitudes.

### Repeticiones individuales

| Orden | Variante     | Ventas / caja p95 | Inventario p95 | Cliente p95 | Servicios / caja p95 |
| ----: | ------------ | ----------------: | -------------: | ----------: | -------------------: |
|     1 | A referencia |             39,84 |          47,72 |       75,87 |                56,52 |
|     2 | B optimizada |             35,55 |          43,09 |       71,17 |                46,60 |
|     3 | B optimizada |             34,14 |          47,68 |       68,34 |                41,26 |
|     4 | A referencia |             39,29 |          46,77 |       72,42 |                52,65 |

El análisis comprobó que **las 1.600 solicitudes de cada escenario entre las
cuatro ejecuciones** tuvieron la misma lista ordenada de sentencias
normalizadas. No hubo errores de negocio ni del observador en los benchmarks.
Las cuatro ejecuciones partieron de los mismos conteos: 681 unidades, 62
presentaciones, 18 ventas, 4 servicios y 4 cajas.

## Pregunta y método

El ensayo anterior tenía veinte solicitudes por escenario concurrente. Se amplió
a cien lotes medidos de cuatro solicitudes por escenario, con dos lotes de
calentamiento. Hay cuatro escenarios: ventas que comparten solo caja; ventas que
comparten inventario y caja; ventas mixtas que comparten cliente y caja;
servicios que comparten solo caja. El resto de datos se crea por operación. Cada
escenario tiene 400 muestras por ejecución.

Se hicieron cuatro ejecuciones en orden A–B–B–A: A usa la implementación
anterior de formato de fecha y B reutiliza el formateador. Cada variante suma
800 muestras por escenario; son 6.400 solicitudes concurrentes medidas en total.
Todas las ejecuciones conservaron el índice 074, el SQL de negocio, el tamaño
del pool, el registro de logs y el mismo arnés. No se ejecutó la suite de
pruebas durante estas mediciones.

Es carga por ráfagas cerradas de cuatro, con preparación y limpieza de datos
entre lotes. No es una prueba de tasa de llegada fija ni de saturación continua;
no permite estimar capacidad de producción ni latencia a otro nivel de
concurrencia.

Se conservaron los casos seriales y las pruebas de retención artificial de 120
ms como controles separados. No se mezclan con los percentiles concurrentes. Hay
dos calentamientos por caso serial y dos lotes de calentamiento por caso
concurrente.

## Observabilidad

- Duración total, consultas, conexión al pool y caché por solicitud, aisladas
  con AsyncLocalStorage.
- Sentencia y bloqueantes reales mediante pg_stat_activity y pg_blocking_pids en
  una conexión observadora.
- Edad de la espera actual mediante pg_locks.waitstart. El máximo observado es
  una cota parcial: el muestreo puede perder esperas breves y una consulta puede
  esperar sucesivamente a varios bloqueantes. No es la duración exacta total de
  espera.
- Ventana desde que Node recibe la respuesta de la sentencia que adquiere el
  recurso hasta recibir COMMIT. Es una aproximación al trabajo posterior al
  bloqueo, no el tiempo exacto retenido dentro de PostgreSQL: el bloqueo puede
  haberse adquirido antes de que el cliente reciba su respuesta.
- Tiempo síncrono de formato de zona horaria y logging, conservando sus
  implementaciones reales.
- Retraso del temporizador del observador respecto a los 5 ms solicitados, por
  lote. Es una señal del proceso Node y no una medición de bloqueo de filas.

Los tiempos SQL medidos desde Node incluyen espera del servidor, transporte y
planificación del cliente. No se interpretan como ejecución pura del motor. La
carga sigue siendo local, con PostgreSQL y caché reales; SSE, push y alertas
externos simulados. HTTP, autenticación y renderizado quedan fuera.

## Diagnóstico y cambio

La primera ejecución larga de referencia dio 47,72 ms de p95 en inventario
compartido, frente a 71,02 ms en la muestra anterior de veinte solicitudes. El
valor alto anterior no se reprodujo de forma estable al ampliar y calentar la
carga; no demuestra por sí solo una regresión causada por el índice o por la
reutilización de presentaciones. No se puede atribuir retrospectivamente aquel
pico a una causa única con las muestras disponibles.

El cliente compartido mantiene la mayor cola: en la primera referencia el p95
total fue 75,87 ms y la ventana mediana posterior a obtener el saldo fue de
15,84 ms. Cuatro operaciones sobre ese mismo saldo se serializan, como exige la
validación de fondos. En inventario, la ventana mediana posterior a bloquear la
presentación fue de 7,40 ms. Los planes y la espera por recursos son problemas
distintos.

El formato de fecha consumía alrededor de 0,67–0,69 ms de mediana por solicitud
concurrente. Se construía un Intl.DateTimeFormat por llamada, incluida la
auditoría de venta después de actualizar caja y mientras se retenían otros
bloqueos. Se reutiliza ahora un único formateador por zona, creado de forma
diferida. Cada llamada sigue leyendo/procesando su fecha y aplicando las reglas
de horario de verano de ese instante. La caché está acotada a una zona; no
almacena fechas, desfases, saldos ni resultados SQL.

El cambio de aplicación se limita a getNowInBusinessTimezone. No cambia el punto
donde se obtiene cada timestamp, las validaciones, los parámetros monetarios,
las consultas, la adquisición de bloqueos, las escrituras, COMMIT ni los efectos
posteriores. getSQLTimezoneOffset conserva su implementación y la prioridad de
DB_TZ.

La segunda A se obtiene mediante una copia de la implementación anterior usada
solo por el benchmark. El repositorio permanece con la aplicación optimizada: no
hay selector de referencia en el código de negocio. El arnés permite alternar
solo el formateador para aislar este cambio.

### Desglose del aumento de p95 anterior

Se revisaron las observaciones concretas que ocuparon el rango 19 de las veinte
solicitudes de inventario compartido en la comparación anterior. Cada fila
siguiente descompone una solicitud completa; no suma percentiles calculados de
manera independiente.

| Componente de esa solicitud                                          | Antes del cambio anterior | Tras reutilización e índice |
| -------------------------------------------------------------------- | ------------------------: | --------------------------: |
| Hasta iniciar el SELECT de configuración que bloquea la presentación |                  13,43 ms |                    24,55 ms |
| SELECT de configuración, incluyendo cola y transporte                |                  32,33 ms |                    37,73 ms |
| Desde recibir ese SELECT hasta recibir COMMIT                        |                   8,99 ms |                     7,91 ms |
| Después de COMMIT                                                    |                   0,81 ms |                     0,83 ms |
| Total de la observación p95                                          |                  55,55 ms |                    71,02 ms |

En esas dos observaciones, la mayor diferencia apareció **antes de intentar
bloquear inventario**: +11,12 ms. Después de obtener la presentación, la
solicitud fue más rápida. La observación de 71,02 ms incluyó 7,09 ms en la
consulta de disponibilidad, 4,61 ms en el UPDATE de disponibilidad y 3,26 ms al
insertar detalles, antes del consumo de inventario. Las anfitrionas eran
distintas entre solicitudes de ese escenario.

La demora del SELECT bloqueante también aumentó al propagarse la cola. Los cinco
lotes de la ejecución anterior con índice tuvieron máximos de 77,25; 45,77;
71,02; 45,31 y 46,16 ms: los valores altos se concentraron en dos lotes. Esto
ubica el aumento observado en demoras previas al recurso y en propagación de
colas, sin demostrar qué combinación de planificación del cliente, transporte o
actividad del servidor originó esas demoras. No hay evidencia de que el índice
hubiera empeorado la selección de unidades; su plan había mejorado.

Son muestras pequeñas y solicitudes distintas. El desglose permite localizar el
coste de aquel ensayo, pero no constituye una atribución causal del p95 de toda
la población.

## Incertidumbre

Los percentiles usan rango más próximo. El análisis calcula un intervalo
descriptivo del 95 % para la diferencia de p95 (B menos A) mediante 2.000
réplicas bootstrap de lotes completos, estratificadas por ejecución. Así se
conserva la dependencia entre las cuatro solicitudes de cada lote. Se usa
xorshift32 con semilla 20261015.

Los intervalos describen estas ejecuciones; no eliminan deriva temporal,
autovacuum, carga del equipo ni el efecto del observador y no corrigen
comparaciones múltiples. Una diferencia cuyo intervalo cruza cero no justifica
asegurar una mejora estable. No se estableció un SLA ni un umbral de rendimiento
como prueba funcional.

## Reproducción y evidencia

Desde la raíz del dashboard, con PostgreSQL y caché locales configurados:

```powershell
$env:REGISTRO_BENCH_BATCHES='100'
$env:REGISTRO_BENCH_RUNS='20'
$ensayos = @(
  @{ modo='referencia'; nombre='antes' },
  @{ modo='actual'; nombre='despues' },
  @{ modo='actual'; nombre='despues-repeticion' },
  @{ modo='referencia'; nombre='referencia-repeticion' }
)
foreach ($ensayo in $ensayos) {
  $env:REGISTRO_BENCH_TIMEZONE=$ensayo.modo
  $env:REGISTRO_BENCH_OUTPUT="docs/rendimiento/concurrencia-larga-$($ensayo.nombre)-2026-10-15.json"
  corepack pnpm exec vitest run --config vitest.registro-benchmark.config.ts
  if ($LASTEXITCODE -ne 0) { throw 'Fallo en benchmark' }
}
node scripts/comparar-concurrencia.mjs --compactar
```

El selector de referencia y la copia anterior viven exclusivamente en
tests/benchmarks. La copia se verificó idéntica a HEAD de timezoneService.ts,
salvo su comentario inicial. El primer A registrado se ejecutó antes de editar
ese módulo; el último usa la referencia bajo el mismo arnés. Todas las pruebas
funcionales posteriores usan la aplicación optimizada.

El arnés acepta entre 5 y 500 lotes y tiene un límite de ejecución de diez
minutos. Modificar el número de lotes puede exigir adaptar el entorno. La
preparación y la limpieza afectan la generación de caché; el benchmark confirma
operaciones reales con datos propios y está destinado a una base local sin
tráfico simultáneo.

- [Comparación y estimaciones](concurrencia-larga-comparacion-2026-10-15.json).
- [A inicial](concurrencia-larga-antes-2026-10-15.json),
  [B inicial](concurrencia-larga-despues-2026-10-15.json),
  [B repetida](concurrencia-larga-despues-repeticion-2026-10-15.json),
  [A repetida](concurrencia-larga-referencia-repeticion-2026-10-15.json).
- Los JSON anteriores son resúmenes legibles; cada uno enlaza mediante
  muestrasComprimidas su archivo .json.gz con las consultas, las muestras y los
  planes completos. muestrasSha256 permite comprobar el contenido descomprimido.
  El comparador puede releerlos automáticamente. Se preservó toda la evidencia y
  se redujeron unos 56 MB de JSON a unos 3,4 MB comprimidos.

No se instalaron nuevos índices ni se modificaron parámetros del servidor, del
pool o de los bloqueos en esta tarea.

## Verificación final

- Suite unitaria completa: **2.443 pruebas aprobadas y 2 omitidas**; 311
  archivos aprobados y 2 omitidos, salida 0.
- PostgreSQL: **39 pruebas aprobadas en 10 archivos**, incluidas concurrencia
  del saldo, consumo único de inventario, rollback posterior al consumo, falta
  de stock en una presentación posterior, exclusión de habitación y anfitrionas,
  ventas, servicios, shots y anulaciones.
- Once pruebas nuevas de fecha verifican el resultado anterior con
  Date/string/número, invierno/verano, los dos cambios de horario de 2026, año
  bisiesto, entradas inválidas/vacías/cero, reloj actual por llamada, prioridad
  de DB_TZ, creación diferida y recuperación tras un fallo de construcción. Las
  pruebas existentes mantienen el orden de ventas y servicios.
- TypeScript, ESLint, Prettier y control de límites entre módulos aprobados. Las
  pruebas dirigidas de fechas y orden también pasaron (22).
- Cuatro benchmarks largos aprobados: 1.747 operaciones por ejecución, incluidos
  seriales, calentamientos y controles artificiales. El comparador verificó el
  mismo orden SQL en cada escenario concurrente y reprodujo idénticos
  percentiles e intervalos al releer los archivos comprimidos. Se verificaron
  sus SHA-256 y las 1.747 muestras de cada archivo.
- Sin fixtures temporales de benchmark/inventario. Los diez conteos de tablas
  medidos al inicio coincidieron al finalizar.

El informe de arquitectura generado por las pruebas se restauró a su estado
previo. Se conservaron los cambios anteriores del usuario. No se desplegó en
producción.
