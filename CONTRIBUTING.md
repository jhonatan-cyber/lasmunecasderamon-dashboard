# Contributing

Guia corta para contribuir sin abrir mas deuda en `lasmunecasderamon`.

## Antes de cambiar codigo

- Lee [README.md](./README.md).
- Si tocas auth, revisa [AUTH_CONTRACT.md](./AUTH_CONTRACT.md).
- Si tocas rutas legacy o naming API, revisa
  [API_ROUTE_AUDIT.md](./API_ROUTE_AUDIT.md).
- No revivas codigo retirado en `src/domains/*`.

## Estructura actual

```text
app/               # Paginas y API routes
components/        # UI por modulo
contexts/          # Context providers
hooks/             # Hooks de dominio y UI
lib/repositories/  # SQL directo y acceso a datos
lib/services/      # Reglas de negocio
lib/api/           # Wrappers y helpers API
tests/             # Unit, integration, e2e
types/             # Tipos globales
```

## Reglas practicas

- Usa `pnpm`.
- Mantiene rutas API canonicas; no agregues aliases nuevos sin necesidad fuerte.
- Si agregas endpoint, alinea web y movil con mismo contrato.
- Si cambias repositorios o servicios, corre `typecheck` y `lint:full`.
- Si tocas flujo auth, agrega o actualiza tests de contrato.
- Los tests con MySQL real van en `tests/integration/legacy-db` o en una suite
  explicita, no en `tests/unit`.

## Comandos minimos antes de cerrar cambio

```bash
corepack pnpm lint:full
corepack pnpm typecheck
corepack pnpm test:unit
```

Si toca flujo heredado con base real:

```bash
corepack pnpm test:integration:legacy-db
```

## Commits

Preferir commits pequenos y claros:

```text
feat: ...
fix: ...
docs: ...
refactor: ...
test: ...
chore: ...
```

## Pull requests

- Explica riesgo funcional.
- Lista validaciones ejecutadas.
- Si hay deuda pendiente, dejala documentada en
  [PLAN_SEGUIMIENTO_CORRECCIONES.md](./PLAN_SEGUIMIENTO_CORRECCIONES.md).
