# Corte 28 — Fase 7 parcial: lecturas de propinas en el módulo

Fecha: 2026-10-05. `TipRepository` queda en delegación y `TipService` compone
del módulo, que ya era dueño de las escrituras desde el corte 13.

## Implementación

- `modules/personal/conceptos` gana `leerResumenPropinas`,
  `leerPropinasDeUsuario`, `leerDetallePropinas` y
  `obtenerPropinaConParticipantes`, mismo SQL (las lecturas cruzadas a usuarios,
  ventas y cajas quedan declaradas para la fase 6).
- Sin aristas nuevas entre dominios.

## Validación

- `pnpm typecheck`: limpio.
- `pnpm arquitectura:limites`: 29/29, sin novedades.
- `pnpm test:unit`: 1735 + 2 omitidas.
- `pnpm test:postgres`: 185/185.
- `eslint` sobre los 5 archivos tocados: sin hallazgos.

## Deuda restante

- `TipRepository` conserva delegación para suites heredadas.
- Mismo patrón pendiente en caja (fase 6) y nómina (Payroll, comisiones
  agregadas, gratificaciones); ciclos restantes.
