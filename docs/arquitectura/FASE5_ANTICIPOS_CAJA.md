# Corte 17 — Anticipos contra caja sobre APIs públicas

Fecha: 2026-10-05. No cierra las fases 5–7; el puente queda igual (2 usos)
porque `ClientRepository`, `CuentaQueries` y temporizadores siguen heredados.

## Implementación

`grantAnticipo` y `deliverAnticipo` (`modules/personal/anticipos`) reciben
`ContextoOperacion` y coordinan con Caja por su API pública en vez de
`CashRegisterRepository`: `obtenerCajaActiva`, `leerFondoCaja` (nueva;
apertura + efectivo para validar el egreso) y `registrarMovimientoCobro`.
`otorgarAnticipo` y `entregarAnticipo` abren `enUnaUnidad` y ejecutan los avisos
(WhatsApp, SSE, push) después del commit. Sin aristas nuevas: la dirección
personal → caja ya estaba exceptuada.

## Paridad preservada

- Mismos errores (`MONTO_EXCEDE_MAXIMO`, `NO_CAJA_ABIERTA`,
  `SALDO_CAJA_INSUFICIENTE`, `ANTICIPO_NO_APROBADO`) y mismo historial
  (solicitud + aprobado + entregado).
- Los avisos salen después del commit en vez de dentro de la transacción; siguen
  siendo fuego-y-olvido salvo el push de entrega, que se espera tras confirmar.

## Tests

- `anticipos-repositorio.test.ts` actualizado al nuevo contrato (contexto vía
  puente de test, aserciones sobre el SQL de caja en vez del adaptador).
- `anticipos.test.ts` y `horas-extras.test.ts`: mockean el driver, que ahora se
  carga vía el contrato transaccional aunque los repositorios estén mockeados.
- Nuevo `tests/postgres/anticipo-caja.test.ts`: otorgar descuenta efectivo y
  postula el movimiento con 3 filas de historial; entregar descuenta una sola
  vez; sin fondo falla sin escribir.

## Validación

- `pnpm typecheck`: limpio.
- `pnpm arquitectura:limites`: 30/30, sin novedades.
- `pnpm test:unit`: 1739 + 2 omitidas.
- `pnpm test:postgres`: 172/172.
- `eslint` sobre los 8 archivos tocados: sin hallazgos.

## Deuda restante

- `ClientRepository`, `CuentaQueries` (caja y habitaciones) y temporizadores
  mantienen los 2 usos del puente; cuentas es el flujo grande que sigue.
