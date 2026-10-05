# Corte 26 — Fase 7 parcial: lecturas, sesión y borrado de cuentas

Fecha: 2026-10-05. `CuentaQueries` queda en helpers puros + delegación: listado,
cierre de sesión y borrado viven en el módulo.

## Implementación

- `modules/operacion/cuentas/repositorio.ts` gana `listarCuentas`,
  `finalizarSesionHabitacion` (con contexto opcional y unidad propia si no hay,
  como el `revertirStockAnulacion` de inventario), `eliminarCuentaFisica`;
  `servicio.ts` expone `listarCuentas`, `finalizarSesionHabitacion` y
  `eliminarCuenta`.
- `CuentaRepository` y `CuentaQueries` delegan (`getAll`, `finalizeRoomSession`,
  `delete`); la historia de habitación se lee y escribe en la misma unidad.
- Sin aristas nuevas entre dominios.

## Validación

- `pnpm typecheck`: limpio.
- `pnpm arquitectura:limites`: 29/29, sin novedades.
- `pnpm test:unit`: 1735 + 2 omitidas.
- `pnpm test:postgres`: 185/185, con cobertura nueva en `cuenta-edicion.test.ts`
  (listar, finalizar sesión, eliminar).
- `eslint` sobre los 6 archivos tocados: sin hallazgos.

## Deuda restante

- `CuentaQueries` conserva helpers puros, `getById`/cobro (ya en unidad) y
  delegación de escrituras para suites heredadas.
- Mismo patrón pendiente en clientes, caja y personal; ciclos restantes y
  fase 6.
