# Dashboard: el composite baja de 84.10 ms a 50.23 ms sin caché (-40%)

Fecha: 26/10/2026. La cola del composite pasó a resolverse en paralelo y la
comparativa semanal dejó de filtrar con `TO_CHAR` sobre `fecha_crea`. Sobre la
base local real, `GET /api/dashboard/composite` sin caché baja de **84.10 ms a
50.23 ms (mediana estable, -40.3%)**; la primera lectura de cada corrida pasa de
491.80 ms a 322.04 ms (-34.5%). Los otros tres endpoints del benchmark no
cambian y los hits de Redis siguen por debajo de 2 ms.

## Resultado

| Endpoint                                 | Antes (8768a608) | Después (fd71b0de) | Diferencia |
| ---------------------------------------- | ---------------: | -----------------: | ---------: |
| composite, sin caché, estable            |         84.10 ms |           50.23 ms | **-40.3%** |
| composite, rango de las 6 muestras       |   74.41-88.42 ms |     40.26-54.98 ms | sin solape |
| composite, primera lectura de la corrida |        491.80 ms |          322.04 ms |     -34.5% |
| sales-by-month, estable                  |          2.52 ms |            2.53 ms |      +0.4% |
| sales-by-week, estable                   |          4.09 ms |            4.28 ms |      +4.6% |
| logged-users, estable                    |          3.14 ms |            2.91 ms |      -7.3% |
| hit de Redis del composite               |          0.75 ms |            0.58 ms | sin cambio |

`estable` es la mediana de las lecturas 2 y 3 de cada corrida: 3 corridas por
lado x 2 lecturas = 6 muestras. La primera lectura de cada corrida abre el pool
y prepara los statements, así que solo sirve para comparar el mismo endpoint
entre lados, nunca entre endpoints.

## Cómo se midió

| Tema         | Detalle                                                                                                                            |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Comando      | `pnpm benchmark:dashboard` (`tests/benchmarks/dashboard.test.ts`)                                                                  |
| Antes        | commit `8768a608`, el previo a la ronda del dashboard                                                                              |
| Después      | commit `fd71b0de`, los cuatro commits de la ronda                                                                                  |
| Aislamiento  | dos árboles de `git archive` en temp con `node_modules` enlazado y el mismo `.env`; solo difieren en los 11 archivos de esta ronda |
| Datos        | PostgreSQL local `lasmunecasderamon` con `ventas` real (sin seed sintético) y Redis local en 127.0.0.1:6379                        |
| Repeticiones | 3 corridas por lado, alternadas (antes, después, antes, después, ...), 3 lecturas sin caché + 3 hits por endpoint                  |
| Cálculo      | mediana de las 6 muestras estables por endpoint; los crudos quedan en esta carpeta                                                 |

## Qué explica cada número

| Cambio                                                                                                     | Efecto medido                                                                                                          |
| ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Actividad reciente, forecast, pedidos pendientes y solicitudes entran al mismo `Promise.all` del composite | Quita 4 round-trips seriales: cerca de los 34 ms ganados                                                               |
| Comparativa semanal con rangos de parámetros en vez de `TO_CHAR`                                           | Sin efecto medible hoy: `ventas` tiene pocas filas y el plan ya era barato. El beneficio aparece cuando la tabla crece |
| Contrato zod y el gráfico de ventas en TanStack Query                                                      | Viven en el cliente: el benchmark no los mide                                                                          |
| Caja abierta unificada entre alertas, composite e insights                                                 | Cambia el número reportado, no la latencia: se lee en la misma consulta que ya existía                                 |

## Límites

- Seis muestras por lado en una sola máquina: los endpoints de 2-5 ms se mueven
  por ±1 ms y sus diferencias no son significativas.
- `logged-users` en frío subió de 4.61 a 12.13 ms, pero `getLoggedUsers` es byte
  idéntico entre los dos commits (`git diff` vacío): es calentamiento de
  corrida, no una regresión.
- No mide el navegador, la caché del cliente ni el render del panel.

## Cómo repetirlo

1. `pnpm benchmark:dashboard` con PostgreSQL local y Redis escuchando en
   127.0.0.1:6379.
2. Comparar las cuatro líneas `{"endpoint": ...}` contra
   `dashboard-composite-antes-2026-10-26.json` y
   `dashboard-composite-despues-2026-10-26.json`.
3. Para medir otro "antes", ejecutar el mismo comando desde un `git archive` del
   commit previo, con el mismo `.env` y el `node_modules` enlazado.

## Checklist

- [ ] El run termina con `Test Files 1 passed (1)` y `Tests 1 passed (1)`.
- [ ] Cada corrida imprime 4 líneas `{"endpoint": ...}` (composite,
      sales-by-month, sales-by-week, logged-users).
- [ ] El rango de las 6 muestras del composite no se solapa con el del otro
      lado.
- [ ] El test limpia sus claves Redis al final (SCAN + DEL con el prefijo
      `verification:benchmark:*`).

## Artefactos

- `dashboard-composite-antes-2026-10-26.json`: crudo del lado `8768a608`.
- `dashboard-composite-despues-2026-10-26.json`: crudo del lado `fd71b0de`.

## Next step

Repetir la medición con volumen real de `ventas` para confirmar el efecto de la
comparativa semanal sargable; con la tabla de hoy ese cambio no se puede medir.
