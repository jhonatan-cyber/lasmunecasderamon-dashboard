# Corte 21 — Alta de cuentas sobre APIs públicas

Fecha: 2026-10-05. No cierra las fases 5–7; cobro y borrado de cuentas siguen
heredados (el cobro con venta ya corre en workflow desde el corte 13).

## Implementación

`modules/operacion/cuentas/alta.ts` expone `crearCuenta`, que abre `enUnaUnidad`
y corre cabecera, detalles, usuarios y ocupación de habitación en una sola
unidad, con los avisos después del commit. El SQL propio vive en
`cuentas/repositorio.ts` (`insertarCuentaBase`, `reescribirHistorialAlta`);
detalles y usuarios reusan las operaciones del corte 20. Sin aristas nuevas
entre dominios; `CuentaQueries` pierde los imports sin uso (`RoomManager` ya
había salido en el corte 20).

`CuentaRepository` y `CuentaQueries` delegan conservando firmas (el alta compone
con `getById`).

## Paridad preservada

- Mismo reparto champagne/normal, mismo historial inicial y misma ocupación
  condicional de habitación.
- Los avisos (`timer_started`, `timers_updated`) salen después del commit en vez
  de dentro de la transacción; la lectura para componerlos es la misma.

## Validación

- `pnpm typecheck`: limpio.
- `pnpm arquitectura:limites`: 31/31, sin novedades.
- `pnpm test:unit`: 1739 + 2 omitidas.
- `pnpm test:postgres`: 182/182, con el alta cubierta en
  `cuenta-edicion.test.ts` (detalles, usuarios, habitación ocupada).
- `eslint` sobre los 10 archivos tocados: sin hallazgos.

## Deuda restante

- Cobro (workflow, corte 13) y borrado de cuentas siguen heredados.
- Los 2 usos del puente quedan para `CashRegisterRepository` (`ClientRepository`
  cubierto, pendiente retirar el adaptador) y `RoomManager` (temporizadores y
  pausas, ya vía propietario).
