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

## Hooks de git

Husky corre dos hooks en `.husky/`, y cada uno hace solo lo que el otro no puede
resolver en segundos.

| Hook         | Qué corre                                                                  |  Tiempo | Saltarlo                 |
| ------------ | -------------------------------------------------------------------------- | ------: | ------------------------ |
| `pre-commit` | `use client` en los `.ts/.tsx` del índice + eslint y prettier de lo staged |    ~5 s | `git commit --no-verify` |
| `pre-push`   | `pnpm typecheck` del proyecto entero                                       | 20-28 s | `git push --no-verify`   |

Los ~5 s del commit son casi todo arranque de `pnpm`: el escaneo cuesta 0.3 s y
lint-staged arranca en ~2 s para luego sumar el eslint de cada archivo staged.
El push tarda 20-28 s con la caché de `tsc` y ~97 s si no existe (`pnpm clean`).
Con `HUSKY=0` se apagan los dos (lo usan CI y `deploy.yml`).

El reparto sigue una regla: el commit paga lo que se resuelve en segundos y el
push paga lo que compila el árbol. `tsc` no compila subconjuntos, así que en
`pre-commit` costaría ~25 s por commit y rompería por errores de otro frente que
todavía no commiteó; en `pre-push` bloquea todo, que es lo correcto porque
publica el árbol tal como está.

Saltarse un hook no salta la compuerta: el job `directivas` de CI corre el
escaneo del **árbol completo** (no solo el índice) y el typecheck en cada PR y
cada push a `main`.

## CI (GitHub Actions)

`.github/workflows/ci.yml` tiene diez jobs. `changes` corre siempre y decide
cuáles de los demás hacen falta según el diff, así que un PR pequeño no paga
Redis, Postgres ni Playwright.

| Job           | Cuándo corre                      | Qué verifica                                                                               |
| ------------- | --------------------------------- | ------------------------------------------------------------------------------------------ |
| `changes`     | siempre                           | Clasifica el diff y publica los flags que consumen los otros jobs                          |
| `directivas`  | siempre                           | `use client` en todo el árbol + `pnpm typecheck`                                           |
| `quality`     | diff de build o completo          | eslint de lo cambiado (todo el repo en diff completo), arquitectura y `pnpm build`         |
| `coverage`    | unit o diff completo              | suite unitaria con el umbral de cobertura                                                  |
| `integration` | integration o diff completo       | Postgres efímero: paridad de esquema, repositorios y flujos                                |
| `e2e`         | e2e o diff completo               | build y Playwright contra una base sembrada                                                |
| `redis`       | cambios de caché, seguridad o SSE | limitador, caché, permisos y SSE contra Redis real                                         |
| `migrations`  | cambios en `migrations/`          | `pnpm db:verify` sobre una base recién creada                                              |
| `mcp`         | cambios en `mcp/`                 | tests del paquete MCP                                                                      |
| `security`    | siempre                           | `pnpm audit --audit-level high` (el informe de dependencias de producción solo se imprime) |

Un push nuevo al mismo PR cancela la corrida anterior (`concurrency` con
`cancel-in-progress`), así que la última es la que cuenta.

### Qué bloquea el deploy

`.github/workflows/deploy.yml` no despliega desde un PR: se dispara con
`workflow_run` cuando termina `CI - Quality & Tests`, y su `if` exige cuatro
cosas a la vez: que el evento haya sido un `push` a `main` (los PR nunca
despliegan), que la corrida completa haya terminado en `success`, que la
variable de repositorio `ENABLE_PRODUCTION_DEPLOY` valga `true` y que la corrida
venga del mismo repositorio y no de un fork. Después, el primer paso del job
aborta si el SHA de la corrida ya no es el HEAD de `main`, para no pisar
producción con un build viejo.

Cualquier job en rojo bloquea el deploy, incluido `directivas`. Lo que no
bloquea es un job **omitido**: sus `if` dieron falso y solo un `failure` cambia
la conclusión de la corrida. Por eso `directivas` no depende del diff — es la
única compuerta de código que atraviesa todos los push.

### Reproducir un job en local

Cada job tiene su equivalente en la máquina. Los que piden servicios usan tu
Postgres y tu Redis locales.

| Job           | Comando local                                                                                              | Requisitos                                                                                              |
| ------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `changes`     | `CI_DIFF_BASE=origin/main CI_DIFF_HEAD=HEAD node scripts/ci-changes.mjs`                                   | Historial de git                                                                                        |
| `directivas`  | `node --test tests/check-use-client.test.mjs && pnpm check:use-client && pnpm typecheck`                   | —                                                                                                       |
| `quality`     | `pnpm lint:full && pnpm arquitectura:limites && pnpm build`                                                | —                                                                                                       |
| `coverage`    | `pnpm test:unit:coverage`, o `BASE_SHA=origin/main HEAD_SHA=HEAD node scripts/run-affected-unit-tests.mjs` | —                                                                                                       |
| `integration` | `pnpm test:postgres && pnpm test:integration:all`                                                          | Postgres local; la suite exige `DB_NAME=lasmunecasderamon`                                              |
| `e2e`         | `pnpm build && pnpm test:e2e`                                                                              | Postgres sembrado y Chromium (`pnpm exec playwright install chromium`); reusa el `:3000` que ya escuche |
| `redis`       | `pnpm redis:start && pnpm test:redis`                                                                      | Redis local (`pnpm redis:check` responde `PONG`)                                                        |
| `migrations`  | `pnpm db:verify`                                                                                           | Postgres local                                                                                          |
| `mcp`         | `pnpm --dir mcp test`                                                                                      | —                                                                                                       |
| `security`    | `pnpm audit --audit-level high`                                                                            | Red                                                                                                     |

Dos avisos:

- `pnpm db:setup` —el paso con el que `integration` rearma la base en CI—
  **borra y recrea** la base a la que apunte `DB_NAME`. Para repetir ese camino
  apuntalo a otra base (`DB_NAME=lasmunecasderamon_test pnpm db:setup`), nunca a
  la de desarrollo.
- `pnpm db:verify` no toca la base operativa: trabaja sobre `<DB_NAME>_migcheck`
  y la elimina al terminar.

El job `integration` también compara el esquema contra el commit base
(`pnpm db:parity --base-ref origin/main`); en local solo hace falta si tocaste
`migrations/`. Y el checkout del repo de Expo que hace `coverage` para los tests
de contrato entre plataformas no se reproduce sin `EXPO_PARITY_ROOT` apuntando a
un clon de la app.

### CRLF: falso "modificado" después de un pull

El repositorio fija LF con `* text=auto eol=lf` en `.gitattributes`, pero la
instalación de Git en Windows trae `core.autocrlf=true` en su config global. Con
esas dos cosas juntas, un archivo que alguna herramienta escribió con CRLF queda
con el blob idéntico en el índice y aun así aparece como modificado, y `git add`
avisa `CRLF will be replaced by LF`. No es trabajo perdido.

```bash
git config --local core.autocrlf false   # una vez por clon
git add --renormalize .                  # sólo si el árbol ya quedó sucio
```

Si `git diff` sale vacío, el cambio no existe: comparalo con
`git hash-object <archivo>` contra `git ls-files -s <archivo>` antes de tocar
nada.

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
