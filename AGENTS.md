<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may
all differ from your training data. Read the relevant guide in
`node_modules/next/dist/docs/` (resolved from this file's directory; in
monorepos the `next` package may not be visible from the repo root) before
writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at
`node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a
diff only re-creates the uncommitted change; committing it with your work keeps
the tree clean.

<!-- END:nextjs-agent-rules -->

# Las Muñecas de Ramón — Dashboard

Panel operativo interno: monolito modular con Next.js (App Router) y PostgreSQL.
Las convenciones obligatorias del proyecto también están en
`.github/GEMINI_INSTRUCTIONS.MD`; léelas antes de proponer cambios.

## Estructura

```text
app/              # Rutas App Router (páginas y app/api/)
components/       # UI por módulo
hooks/            # Lógica de dominio y UI
modules/<dominio>/# API pública (index.ts) y, si aplica, contracts.ts
workflows/        # Coordinación de casos de uso entre módulos
lib/database/     # Pool PostgreSQL y transacciones
tests/            # unit, integration y e2e
```

Los consumidores importan desde `modules/<dominio>/index.ts` o
`modules/<dominio>/contracts.ts`; la persistencia privada de un módulo no se
importa desde fuera. El gate `corepack pnpm arquitectura:limites` bloquea
imports privados, ciclos y escrituras en tablas ajenas. No todos los módulos
exponen `contracts.ts`, solo los que lo necesitan.

## Reglas de código

- TypeScript estricto: no uses `any` (prefiere `unknown` y type guards).
- SQL siempre con consultas preparadas; nunca interpoles valores en el string.
- Estilos con Tailwind y `cn()`; nada de `style={{ ... }}` inline.
- Formularios con `react-hook-form` + `@hookform/resolvers/zod`.
- Datos de cliente con TanStack Query; estado global síncrono con Zustand.
- Deja `'use client'` en el nodo más bajo posible del árbol.

## Flujo de trabajo

```bash
corepack pnpm typecheck
corepack pnpm lint:full
corepack pnpm test:unit
corepack pnpm build
```

Si tocas flujos con base de datos: `corepack pnpm test:integration:legacy-db`.

## Presupuesto por archivo de test

Las tres suites fallan además si **un solo archivo se pasa del presupuesto de
duración**, nombrando el culpable con su tiempo:

| Comando                       | Presupuesto                   | Variable de entorno       |
| ----------------------------- | ----------------------------- | ------------------------- |
| `corepack pnpm test:unit`     | 45 s (120 s con `--coverage`) | `UNIT_FILE_BUDGET_MS`     |
| `corepack pnpm test:postgres` | 120 s                         | `POSTGRES_FILE_BUDGET_MS` |
| `corepack pnpm test:e2e`      | 180 s                         | `E2E_FILE_BUDGET_MS`      |

En unitarias el motivo es que el síntoma sin diagnóstico es una suite que se
arrastra sin decir cuál de los 380 archivos es el culpable. El corte de 60 s del
canal RPC es por llamada y no por archivo, así que el presupuesto es una cota de
salud: 45 s sin cobertura, y 120 s con ella, porque CI corre
`test:unit:coverage` y la instrumentación v8 lleva al más pesado de 17 s a 71 s.
En Postgres la suite corre en serie contra una BD real: el archivo más lento
(`tests/postgres/cierre-caja-autorizado.test.ts`) tarda ~45 s aislado y ~90 s
dentro de la corrida completa, porque el acopio de los 37 módulos se lleva la
otra mitad. En E2E los specs más largos (`venta-caja`, `login`) suman ~70 s con
reintentos incluidos, así que 180 s deja holgura. En los tres casos el reporter
convierte el síntoma (suite que se arrastra sin señalar al culpable) en un fallo
con nombre y tiempo.

Reporteros: `scripts/vitest/duration-budget-reporter.ts`,
`scripts/playwright/duration-budget-reporter.ts` y el formateo común en
`scripts/duration-budget.ts` (etiqueta `[file-budget]`). Playwright no acepta
instancias en `reporter`, por eso se carga por ruta desde
`playwright.config.ts`.

Si un archivo se pasa del presupuesto, no subas el límite: pártelo por escenario
en varios archivos que compartan fixtures en un módulo auxiliar (los `vi.mock`
se izan por archivo, así que deben quedarse en cada `*.test.tsx`). Ejemplos ya
hechos: `tests/unit/hooks/barrels-public-contract*.test.ts` (un tramo por
archivo; `accounts` va solo porque su import paga el grafo más pesado) y
`tests/unit/components/SaleProductModal*.test.tsx` con
`sale-product-modal-harness.tsx`.

## Skills locales

Hay guías especializadas en `.agents/skills/*/SKILL.md` (UI/UX, rendimiento,
accesibilidad, tests, Next.js, shadcn, etc.). Consúltalas cuando la tarea
corresponda y aplica sus lineamientos.

No borres el bloque `nextjs-agent-rules` de arriba: `next dev` lo reescribe.
