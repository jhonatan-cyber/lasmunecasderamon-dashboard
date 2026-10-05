# Corte 19 — Temporizador y solicitud de anulación de cuentas

Fecha: 2026-10-05. No cierra las fases 5–7; `updateCuenta`, creación, cobro y
borrado de cuentas siguen heredados.

## Implementación

`modules/operacion/cuentas/temporizadores.ts` expone `detenerTemporizadorCuenta`
y `solicitarAnulacionCuenta`. Abren `enUnaUnidad` y coordinan con el mismo
`ContextoOperacion`; los avisos salen después del commit. El SQL propio vive en
`cuentas/repositorio.ts`. La lógica pura de historial se reusa de
`lib/repositories/cuenta/CuentaRoomHistory` sin duplicar (los métodos estáticos
de `CuentaQueries` siguen ahí para el `updateCuenta` heredado).

`CuentaRepository` y `CuentaQueries` delegan conservando firmas (`stopTimer`
compone con `getById` como antes). Sin aristas nuevas entre dominios.

## Paridad preservada

- Mismos errores (`CUENTA_NO_ANULABLE`, `MONTO_INVALIDO`, `MONTO_EXCEDE_TOTAL`)
  y mismo cierre de sesión de habitación.
- `finalizeRoomSession` ahora lee y escribe en la misma unidad (antes leía por
  otra conexión); mismo resultado.
- Los SSE (`room_available`, `timer_stopped`, `timers_updated`) salen después
  del commit, igual que antes salían después de la transacción.

## Validación

- `pnpm typecheck`: limpio.
- `pnpm arquitectura:limites`: 31/31, sin novedades.
- `pnpm test:unit`: 1739 + 2 omitidas.
- `pnpm test:postgres`: 178/178, con el nuevo `cuenta-temporizador.test.ts`
  (detener, solicitar con congelamiento + estado 2, rechazo de monto mayor).
- `eslint` sobre los 7 archivos tocados: sin hallazgos.

## Deuda restante

- `updateCuenta`, creación, cobro y borrado de cuentas siguen en `CuentaQueries`
  (el último usa `RoomManager` con la conexión global, no en transacción).
- Los 2 usos del puente quedan para `ClientRepository` (cubierto en corte 18,
  pendiente retirar el adaptador), `CuentaQueries.updateCuenta` y
  temporizadores.
