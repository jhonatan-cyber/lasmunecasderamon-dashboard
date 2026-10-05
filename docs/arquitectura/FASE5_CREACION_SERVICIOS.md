# Corte 16 — Alta y edición de servicios sobre APIs públicas

Fecha: 2026-10-05. Completa la migración de servicios iniciada en el corte 15
(quedaban creación y edición). No cierra las fases 5–7.

## Implementación

`modules/operacion/servicios/creacion.ts` expone `crearServicio` y
`actualizarServicioCasoUso`. Abren `enUnaUnidad` y coordinan con el mismo
`ContextoOperacion`, mismo cálculo y mismo orden que
`ServiceService.createService` / `updateServicio`. El SQL propio vive en
`servicios/repositorio.ts`.

Coordinación por propietario:

| Propietario | Operación                                                                                                        |
| ----------- | ---------------------------------------------------------------------------------------------------------------- |
| Clientes    | `consumirPrepagoVenta` (reuso; el id va en `venta_id`)                                                           |
| Caja        | `obtenerCajaActiva`, `registrarMovimientoCobro`, `ajustarIvaCaja` (nueva; conserva el `GREATEST(0, …)` heredado) |
| Personal    | `registrarComisionesServicio` (nueva, por `servicio_id`)                                                         |
| Identidad   | `validarAnfitrionasEnLocal` (nueva; mismo SQL del `getLoggedInHostessIds` heredado)                              |
| Operación   | lectura e inserción propias, `ocuparHabitacionVenta`, `pausarConflictosServicio` (nueva)                         |

`ServiceService` delega conservando firmas y respuestas; el aviso
`timers_updated` sale después del commit. Sin aristas nuevas entre dominios:
todas las direcciones ya estaban exceptuadas.

## Validación

- `pnpm typecheck`: limpio.
- `pnpm arquitectura:limites`: 30/30, sin novedades.
- `pnpm test:unit`: 1739 + 2 omitidas (los mocks de `CashRegisterRepository` /
  `RoomManager` en `ServiceService.test.ts` siguen interceptando por debajo).
- `pnpm test:postgres`: 169/169, con el nuevo `creacion-servicio.test.ts` (alta
  postula caja/comisiones/habitación; edición ajusta el IVA sin duplicar).
- `eslint` sobre los 18 archivos tocados: sin hallazgos.

## Deuda restante

- Los 2 usos del puente (`CashRegisterRepository`, `RoomManager`) quedan para
  `CuentaQueries`, `ClientRepository`, anticipos y temporizadores.
- `ServiceQueries` conserva lecturas + `rawInsert`/`updateServicio` como
  adaptadores (la edición ya delega; el alta directa por repositorio no tiene
  llamadores fuera de `ServiceService`).
