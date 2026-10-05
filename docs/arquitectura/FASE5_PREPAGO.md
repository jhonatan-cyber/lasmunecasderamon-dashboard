# Corte 18 — Recarga y devolución de prepago sobre APIs públicas

Fecha: 2026-10-05. No cierra las fases 5–7; el puente queda igual (2 usos)
porque `CuentaQueries` y temporizadores siguen heredados.

## Implementación

`modules/clientes/prepago` expone `cargarPrepago` y `devolverSaldo`, que abren
`enUnaUnidad` sin efectos posteriores (estos flujos no avisan). El SQL propio
vive en el mismo repositorio. Coordinación por propietario, mismo SQL y mismo
orden que `ClientRepository`:

| Propietario | Operación                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Caja        | `obtenerCajaActiva`, `registrarMovimientoCobro` (reuso)                                                                                          |
| Operación   | `crearCuentaPrepagoRecarga`, `cerrarCuentasPrepagoSaldadas` (nuevas; la cuenta PREP-* sólo visibiliza el saldo y no bloquea la recarga si falla) |

`ClientService` y `ClientRepository` delegan conservando firmas. La peculiaridad
de precedencia en el cálculo de `metadatos` se preserva tal cual.

## Paridad preservada

- Mismos errores (`NO_CAJA_ABIERTA`, `MONTO_INVALIDO`, `SALDO_INSUFICIENTE`,
  `Cliente no encontrado`) y mismo `GREATEST(0, …)` al descontar.
- La devolución sigue sin tocar caja; el auto-cierre PREP-* al saldar cierra
  todas las abiertas del cliente, igual que antes.

## Control de dependencias

Nueva arista `clientes → operacion`, registrada como excepción explícita (ciclo
clientes → operacion → caja → ventas → clientes). No se declara eliminado el
ciclo; debe subir a un workflow.

## Validación

- `pnpm typecheck`: limpio.
- `pnpm arquitectura:limites`: 31/31, sin novedades fuera de la excepción
  registrada.
- `pnpm test:unit`: 1739 + 2 omitidas (`ClientService`/`ClientRepository`
  actualizados al nuevo contrato).
- `pnpm test:postgres`: 175/175, con el nuevo `prepago-flujo.test.ts` (recarga,
  devolución parcial/total con auto-cierre, fallo sin caja; en deltas donde la
  base dev ya tenía datos).
- `eslint` sobre los 11 archivos tocados: sin hallazgos.

## Deuda restante

- `CuentaQueries` (cobro, habitaciones) y temporizadores (ventas/cuentas
  cruzadas) mantienen los 2 usos del puente; cuentas es el flujo grande que
  sigue. Fase 7 retirará los adaptadores (`ClientRepository.addPrepago` y
  `devolverSaldo` ya sólo delegan).
