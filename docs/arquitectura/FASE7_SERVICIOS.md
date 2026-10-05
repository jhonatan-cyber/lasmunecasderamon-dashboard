# Corte 25 — Fase 7 parcial: lecturas de servicios y retiro de ServiceQueries

Fecha: 2026-10-05. `ServiceQueries.ts` se elimina: era sólo delegación desde el
corte 16 más lecturas, que ahora viven en el módulo.

## Implementación

- `modules/operacion/servicios/repositorio.ts` gana `listarServicios`,
  `listarServiciosPorFechas`, `listarServiciosDeUsuario`,
  `obtenerServicioDetallado` (mismo SQL) y `eliminarServicioFisico`;
  `servicio.ts` los reexporta con `eliminarServicio` en unidad propia.
- `ServiceService` compone todo del módulo y pierde el import a
  `ServiceRepository`; `ServiceRepository` delega lo restante.
- Caen `rawInsertServicio` (sin llamadores) y el `updateServicio` heredado; el
  borrado físico vive en el módulo (sólo tests heredados).
- `repositories.test.ts` usa la API del módulo; se retira el mock de
  `ServiceRepository` en `ServiceService.test.ts` (el servicio ya no lo
  importa).

## Validación

- `pnpm typecheck`: limpio.
- `pnpm arquitectura:limites`: 29/29, sin novedades.
- `pnpm test:unit`: 1735 + 2 omitidas.
- `pnpm test:postgres`: 184/184.
- `eslint` sobre los 7 archivos tocados: sin hallazgos.

## Deuda restante

- `ServiceRepository` conserva delegación para suites heredadas; su retiro total
  espera a fase 6.
- Mismo patrón pendiente en cuentas, clientes, caja y personal.
