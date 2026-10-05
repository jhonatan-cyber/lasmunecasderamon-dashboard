# Corte 27 — Fase 7 parcial: fichas de clientes en el módulo

Fecha: 2026-10-05. `ClientRepository` queda en delegación: altas, edición,
borrado, listado, detalle e historial viven en `modules/clientes/fichas`.

## Implementación

- `modules/clientes/fichas` con `listarClientes`, `obtenerCliente`,
  `crearCliente`, `actualizarCliente`, `eliminarClienteFisico` y
  `obtenerHistorial`, mismo SQL (el historial conserva sus lecturas cruzadas
  declaradas a servicios, ventas y usuarios para la fase 6).
- `ClientService` compone del módulo y pierde el import al repositorio;
  `ClientRepository` delega.
- Caen `getByIdForUpdate` y `updateBalance` (sin llamadores).
- Tests: `ClientService.test.ts` mockea el módulo; `ClientRepository.test.ts`
  sin cambios de contrato.

## Validación

- `pnpm typecheck`: limpio.
- `pnpm arquitectura:limites`: 29/29, sin novedades.
- `pnpm test:unit`: 1735 + 2 omitidas.
- `pnpm test:postgres`: 185/185.
- `eslint` sobre los 6 archivos tocados: sin hallazgos.

## Deuda restante

- `ClientRepository` conserva delegación para rutas alternas y suites heredadas.
- Mismo patrón pendiente en caja y personal; ciclos restantes y fase 6.
