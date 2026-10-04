# Fase 2 — Piloto: Horas extras

Fecha: 2026-10-03. Estado: implementada.

## Qué entrega

| Tarea (§7, Fase 2)                                         | Estado                                                                                            |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Migrar `OvertimeService` y `OvertimeRepository` a Personal | `modules/personal/` — repositorio privado, servicio como casos de uso                             |
| Exponer operaciones y DTO públicos sin filtrar tipos SQL   | `contracts.ts` (tipos aptos para cliente); ninguna fila ni tipo del driver cruza el límite        |
| Adaptar rutas sin cambiar URL ni permisos                  | Las 3 rutas de `app/api/overtime/` cambian sólo el import y el nombre de la operación             |
| Adaptadores temporales en imports antiguos                 | No hicieron falta: los consumidores eran 3 rutas y tests; se migraron todos y los archivos viejos |
|                                                            | se borraron (§9: no mantener dos rutas de escritura activas)                                      |
| Migrar consumidores y tests                                | Test unitario nuevo, línea base actualizada, test del contrato extendido                          |

## La estructura del primer módulo

```text
modules/personal/
  index.ts                       # API pública de servidor: lo único que importa quien está fuera
  contracts.ts                   # Tipos aptos para consumidores; importable desde la UI
  horas-extras/
    servicio.ts                  # Aplicación: valida con zod y orquesta; sin SQL
    repositorio.ts               # Infraestructura: SQL privado, sólo importable dentro del módulo
```

Se creó sólo lo que se llena: `application/`, `domain/` e `infrastructure/` del
§5 son un ejemplo orientativo y no valen como carpetas vacías. Anticipos,
comisiones, propinas y nómina agregarán su propio directorio al migrar.

## El contexto opaco ahora se resuelve

La Fase 1 declaró una limitación: el contrato transaccional no podía escribir
dentro de la unidad por sí solo, y «el contrato nuevo se probará de verdad
cuando el primer módulo migrado (Fase 2) pase por él». Eso quedó cerrado así:

- `lib/transaccion/infraestructura.ts` expone `resolverTransaccion(contexto)`,
  que convierte el contexto opaco en el ejecutor de sentencias de la unidad. Es
  la vía del §6: «sólo la infraestructura autorizada resuelve ese contexto al
  cliente PostgreSQL». El contrato sigue sin exponer SQL a quien lo recibe.
- `enUnaUnidad` registra el ejecutor al abrir la unidad y lo libera en `finally`
  (también tras un rollback). Resolver el contexto de una unidad cerrada falla:
  escribir después del commit o del rollback es exactamente la fuga que el §6
  prohíbe.
- La puerta `infra-transaccional-autorizada` restringe el import de ese archivo
  a `modules/` y `lib/transaccion/`. Un servicio, un workflow o una ruta que lo
  importen hacen fallar el control.
- `tests/postgres/contrato-transaccion.test.ts` prueba ahora el ciclo completo
  con escritura real: el módulo escribe dentro de una unidad ajena y se confirma
  junto; un fallo posterior revierte lo escrito por el módulo; y una operación
  sin contexto sigue yendo por el pool como siempre.

Cada operación del módulo acepta un `ContextoOperacion` opcional. Sin contexto
va por el pool —la línea base no se movió: listar 1 consulta, crear 2, techos 4
y 5—. Con contexto escribe en la transacción de la unidad, que es como
participará del cobro de la Fase 5 si hace falta.

## Tres reglas nuevas en la puerta

| Regla                            | Qué prohíbe                                                                                        |
| -------------------------------- | -------------------------------------------------------------------------------------------------- |
| `modulo-solo-api-publica`        | Importar el interior de un módulo desde fuera: sólo valen `modules/<mod>` (index) y `contracts.ts` |
| `ui-consume-modulos-por-http`    | `components/` y `hooks/` no importan módulos; la UI de `app/` sólo `contracts.ts`                  |
| `infra-transaccional-autorizada` | Importar `lib/transaccion/infraestructura` fuera de la infraestructura de los módulos              |

Los tres fallos están fijados en
`tests/unit/scripts/limites-arquitectura.test.ts` con un repositorio de prueba,
igual que las reglas de Fase 1. Un detalle que salió al escribir la regla:
`@/modules/personal` (el directorio) no se resuelve a `index.ts` porque el
resolutor del grafo sólo agrega el sufijo cuando la ruta cruda no existe; la API
pública admitida es el directorio o `index.ts`, nunca un archivo interior.

## Comportamiento conservado

- URLs, permisos (`overtime.view` / `overtime.write`), auditoría y respuestas
  HTTP idénticas. El `POST` sigue devolviendo `{ id }` con la fila completa de
  `SELECT *` — que es lo que hoy devuelve la API y consume la UI; el contrato lo
  tipa como `HoraExtraRegistrada` con los campos conocidos y llave abierta.
- El listado sigue mapeando a la forma con `usuario` y `usuario_foto`.
- Sin cambios de esquema, sin migraciones, sin cambio de validación zod.

## Deuda conocida, no tocada en el piloto

- `PayrollRepository` hace `UPDATE horas_extras SET estado = 0` al liquidar:
  escritura cruzada heredada que migra con nómina en la Fase 6. Como nómina y
  horas extras son el mismo dominio (personal), no abre ciclos.
- Lecturas directas de `horas_extras` en `StatsQueries` (reportes),
  `EventQueries` (agenda) y `lib/business/anticiposUtils`: quedan para las fases
  6 y 7; la del reporte es de las lecturas cruzadas registradas que el §6
  admite.
- `server-only` no está instalado: la protección de la API pública es hoy la
  regla estática de la puerta. Instalar el paquete exige un stub en las dos
  configs de vitest (el paquete lanza fuera de un entorno React Server
  Component); queda pendiente junto con la Fase 3.
- `actualizarHoraExtra` y `eliminarHoraExtra` no tienen ruta HTTP que las use
  (tampoco la tenían en `OvertimeService`); se conservan como parte de la API
  del módulo.## Verificación

- `pnpm arquitectura:limites`: sin dependencias prohibidas nuevas, 26/26
  excepciones vigentes, ninguna obsoleta.
- `pnpm typecheck`: sin errores. ESLint y Prettier: sin hallazgos en los
  archivos tocados.
- Suite unitaria: **1695 aprobadas** (había 1687: −7 del servicio viejo, +11 del
  módulo, +4 de las reglas nuevas).
- Suite postgres: **155 aprobadas** (había 150: +5 en el contrato transaccional,
  que ahora escribe de verdad dentro de la unidad).
- Línea base intacta: horas extras **listar 1 consulta** (techo 4) y **crear 2**
  (techo 5); el resto de los flujos sin cambios (cobro 15, anulación 2 y 32,
  biometría 6 y 4).

## Primera réplica del patrón: anticipos

Anticipos migra con el mismo diseño — `modules/personal/anticipos/` con
`servicio.ts` (aplicación) y `repositorio.ts` (infraestructura privada, el
antiguo `anticipo/AnticipoQueries.ts` movido verbatim), contratos públicos en
`contracts.ts` y API por el `index.ts` del módulo — con dos diferencias que el
patrón admite:

1. **Sin `ContextoOperacion` todavía.** Otorgar, procesar y entregar abren hoy
   su propia transacción (tocan caja vía `CashRegisterRepository`); que
   participen de una unidad ajena es trabajo de la Fase 5/6, cuando el workflow
   exista. La operación de horas extras sí lo acepta porque su camino es
   trivial; anticipos documenta la deuda en el encabezado del repositorio.
2. **El listado de solicitudes de la ruta `GET /api/anticipos/solicitudes`**
   tenía SQL en la ruta; se movió al repositorio como
   `listarSolicitudesDeUsuario`, que es una consulta más fuera de los
   controladores HTTP (§9).

Deuda heredada que el movimiento no cambia (anotada en el repositorio): la
coordinación con caja, el cierre de gratificaciones dentro de
`procesarSolicitud` (intra-módulo) y el SQL de `anticiposUtils` (Fase 6). Las
rutas `balances`, `maximo` y `solicitud-detalles` conservan su SQL: las dos
primeras leen `anticiposUtils`, la tercera es el patrón legítimo de autorización
por token (§5).

La línea base incorpora los dos flujos de anticipos: **listar 2 consultas**
(techo 5) y **crear 5** (techo 10), con fixture de comisión vigente para pasar
la regla de monto máximo y calentamiento de las cachés de configuración. El mock
de `pushNotifications` en la suite debía devolver promesas: el repositorio
encadena `.catch(...)` sobre el resultado, y un `vi.fn()` desnudo devuelve
`undefined` — un TypeError disfrazado de DatabaseError.
