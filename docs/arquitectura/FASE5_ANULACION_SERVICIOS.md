# Corte 15 — Anulación de servicios sobre APIs públicas

Fecha: 2026-10-05. Réplica del corte 14 para servicios. No cierra las fases 5–7;
el puente queda igual (2 usos) porque sus demás llamadores siguen heredados.

## Implementación

`modules/operacion/servicios/anulaciones.ts` expone `aprobarAnulacionServicio`,
`actualizarEstadoServicio`, `solicitarAnulacionServicio` y
`procesarAnulacionServicio`. Cada una abre `enUnaUnidad` y coordina con el mismo
`ContextoOperacion`; los efectos (auditoría) corren después del commit. El SQL
propio (`servicios`, `detalle_servicios`, `solicitudes_anulacion_servicios`)
vive en `servicios/repositorio.ts`.

Coordinación por propietario, mismo SQL que `ServiceQueries`:

| Propietario | Operación                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------- |
| Clientes    | `leerPrepagoConsumidoPorVenta`, `restituirPrepagoPorAnulacion` (reuso del corte 14; el id va en `venta_id`)   |
| Caja        | `registrarMovimientoCobro` con deltas negativos                                                               |
| Personal    | `revertirComisionesServicioPorAnulacion`, `leerComisionTotalServicioPorAnulacion` (nuevas, por `servicio_id`) |
| Identidad   | `actualizarDisponibilidad` (ya existía)                                                                       |
| Operación   | `liberarHabitacionPorAnulacion`, lectura y marca de estado propias                                            |

`ServiceService` delega conservando firmas y `SecurityAlertService`;
`ServiceQueries` queda en lecturas + creación/edición + delegación.

## Paridad preservada

- `updateStatus` es **liviano a propósito**: sólo reacomoda habitación (si
  estaba activa) y disponibilidad. La reversión de plata vive únicamente en la
  anulación aprobada, igual que antes.
- `requestAnulacion` no cambia el estado del servicio (igual que antes; a
  diferencia de ventas, que marca 3).
- `processAnulacion` corre en **una sola unidad** (antes eran dos transacciones)
  y la auditoría sale después del commit.

## Control de dependencias

Nueva arista `operacion → personal`, registrada como excepción explícita (ciclo
operacion → personal → caja → reportes → operacion): la anulación de servicios
revierte comisiones vía Personal en la misma unidad, donde antes era SQL
directo. No se declara eliminado el ciclo; debe subir a un workflow. Puente sin
cambios (2 usos: `CashRegisterRepository` y `RoomManager`, por creación de
servicios, cuentas, anticipos y temporizadores).

## Validación

- `pnpm typecheck`: limpio.
- `pnpm arquitectura:limites`: 30/30 (2 puentes + 28 ciclos), sin novedades
  fuera de la excepción registrada.
- `pnpm test:unit`: 1739 + 2 omitidas.
- `pnpm test:postgres`: 167/167, con el nuevo `anulacion-servicio.test.ts`
  (aprobación revierte prepago/caja/comisiones; rechazo no mueve plata).
- `eslint` sobre los 9 archivos tocados: sin hallazgos.

## Deuda restante

- `ServiceService.createService` / `updateServicio` siguen con `withTransaction`
  y escrituras cruzadas (prepago, caja, comisiones, habitación): próximo
  candidato, mismo tratamiento.
- `CuentaQueries`, `ClientRepository`, anticipos y temporizadores mantienen los
  2 usos del puente.
