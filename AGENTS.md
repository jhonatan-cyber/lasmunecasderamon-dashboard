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

## Skills locales

Hay guías especializadas en `.agents/skills/*/SKILL.md` (UI/UX, rendimiento,
accesibilidad, tests, Next.js, shadcn, etc.). Consúltalas cuando la tarea
corresponda y aplica sus lineamientos.

No borres el bloque `nextjs-agent-rules` de arriba: `next dev` lo reescribe.
