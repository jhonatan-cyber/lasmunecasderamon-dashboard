# Corte 23 — El puente transaccional llega a cero

Fecha: 2026-10-05. Hito de la fase 5: ningún código de producción usa
`conContextoOperacionExistente` fuera del único uso permitido
(`SaleService.createSale` con transacción ajena, que la puerta autoriza sin
excepción).

## Implementación

- `CashRegisterRepository.getCurrentCajaId` y `updateBalances` (los dos
  adaptadores al contexto opaco) se eliminan: no tenían llamadores en producción
  desde los cortes 14–18. Se retiran sus imports al puente y al módulo; la
  última excepción `puente-transaccional-heredado` se retira y la puerta queda
  en 29/29 sólo con ciclos.
- `WithdrawalService` pierde un import muerto; sus tests y los de
  `ServiceService` dejan de mockear los adaptadores eliminados (el camino real
  por el módulo ya estaba cubierto en postgres).

## Validación

- `pnpm typecheck`: limpio.
- `pnpm arquitectura:limites`: 29/29, sin la regla del puente entre los
  hallazgos.
- `pnpm test:unit`: 1735 + 2 omitidas.
- `pnpm test:postgres`: 184/184.
- `eslint` sobre los 6 archivos tocados: sin hallazgos.

## Deuda restante

- `SaleService.createService` conserva el único uso legítimo del puente
  (transacción ajena con `onAfterCommit`).
- Quedan ciclos entre dominios (29 aristas exceptuadas) y adaptadores de
  delegación (`SaleQueries`, `ServiceQueries`, `ClientRepository`,
  `CuentaQueries`/`CuentaRepository`); fase 7 los retirará cuando sus lecturas
  migren.
