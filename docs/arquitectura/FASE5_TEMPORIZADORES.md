# Corte 22 — Cierre de temporizadores en contexto opaco

Fecha: 2026-10-05. No cierra las fases 5–7; cobro y borrado de cuentas siguen
heredados.

## Implementación

`revisarTemporizadores` cierra cada temporizador vencido en su propia unidad con
`ContextoOperacion` (`cerrarTemporizadorEnUnidad`): estado final por su
propietario (`servicios`, `finalizarVentaTemporizada`,
`finalizarCuentaTemporizada`), disponibilidad por Identidad y habitación por su
propietario; el aviso a ventas sale después del commit. Los avisos de push/SSE
previos siguen saliendo tras marcar la fila, igual que antes.

`RoomManager.updateHostessServiceStatus` queda sin llamadores en producción y se
elimina junto con el import al puente: la excepción se retira y el puente baja
de 2 usos a 1 (`CashRegisterRepository`, por `ClientRepository` cubierto en el
corte 18 —pendiente retirar el adaptador— y `CuentaQueries.updateCuenta` migrado
en el corte 20).

## Paridad y diferencias deliberadas

- Mismos estados finales (servicio/venta 1, cuenta 0) y misma disponibilidad.
- Venta y cuenta vencidas ahora liberan la habitación con resume-o-libera en vez
  de liberarla incondicionalmente: si hay un servicio pausado esperando esa
  habitación, se reanuda (criterio del resto de los flujos).

## Validación

- `pnpm typecheck`: limpio.
- `pnpm arquitectura:limites`: 30/30 (1 puente + 29 ciclos), sin novedades fuera
  de la excepción retirada.
- `pnpm test:unit`: 1735 + 2 omitidas (se retiran 4 pruebas del adaptador
  eliminado).
- `pnpm test:postgres`: 184/184, con el nuevo `temporizadores-cierre.test.ts`
  (cierre con liberación; vigente intacto).
- `eslint` sobre los 10 archivos tocados: sin hallazgos.

## Deuda restante

- Cobro (workflow, corte 13) y borrado de cuentas siguen heredados.
- El último uso del puente es `CashRegisterRepository` (lecturas y movimientos
  con `trx` heredada); fase 7 retirará el adaptador.
