# Corte 20 — Edición de cuentas sobre APIs públicas

Fecha: 2026-10-05. No cierra las fases 5–7; creación, cobro y borrado de cuentas
siguen heredados.

## Implementación

`modules/operacion/cuentas/actualizacion.ts` expone `actualizarCuenta`, que abre
`enUnaUnidad` y corre los tres bloques del `updateCuenta` heredado en una sola
unidad (antes el primero iba en transacción y los otros dos en consultas
sueltas): detalles y usuarios, extensión de tiempo y cambio de habitación. El
SQL propio vive en `cuentas/repositorio.ts`; la habitación se ocupa o libera por
su propietario (`ocuparHabitacionSiCorresponde`,
`liberarHabitacionPorAnulacion`) y los avisos salen después del commit. La
lógica pura de historial se reusa de `CuentaRoomHistory` sin duplicar.

`CuentaRepository` y `CuentaQueries` delegan conservando firmas (`updateCuenta`
compone con `getById`). Sin aristas nuevas entre dominios; `CuentaQueries` ya no
importa `RoomManager`.

## Paridad preservada

- Mismo reparto champagne/normal de detalles, mismos acumulados y mismos estados
  de temporizador e historial.
- La ocupación condicional de habitación se evalúa con la fila leída, igual que
  el `AND (precio > 0 OR tiempo > 0)` heredado.

## Validación

- `pnpm typecheck`: limpio.
- `pnpm arquitectura:limites`: 31/31, sin novedades.
- `pnpm test:unit`: 1739 + 2 omitidas.
- `pnpm test:postgres`: 181/181, con el nuevo `cuenta-edicion.test.ts`
  (detalles + usuarios, extraTiempo, cambio de habitación con liberación).
- `eslint` sobre los 10 archivos tocados: sin hallazgos.

## Deuda restante

- Creación, cobro y borrado de cuentas siguen en `CuentaQueries`; el cobro con
  venta ya corre en workflow desde el corte 13.
- Los 2 usos del puente quedan para `CashRegisterRepository` (`ClientRepository`
  cubierto, pendiente retirar el adaptador),
  `RoomManager.updateHostessServiceStatus` (temporizadores) y
  `RoomManager.pauseConflictingServices` (creación de servicios y cuentas, ya
  vía propietario).
