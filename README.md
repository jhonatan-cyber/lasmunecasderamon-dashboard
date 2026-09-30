# Las Munecas de Ramon Web

Aplicacion `Next.js 16` que combina sitio publico y panel operativo interno.

## Arquitectura

Proyecto usa arquitectura por capas:

```text
app/api/          # Rutas App Router / API
components/       # UI y componentes por modulo
hooks/            # Hooks de dominio y UI
lib/services/     # Logica de negocio
lib/repositories/ # Acceso a datos con SQL directo
lib/database/     # Pool PostgreSQL y transacciones
tests/            # Unit, integration, e2e
types/            # Tipos TypeScript globales
```

## Requisitos

- Node.js 24+
- `corepack` habilitado
- `pnpm`
- PostgreSQL 18 y variables de entorno validas para flujos con DB real

## Instalacion

```bash
corepack pnpm install
```

## Scripts principales

```bash
# Desarrollo
corepack pnpm dev
corepack pnpm build
corepack pnpm start

# Calidad
corepack pnpm lint
corepack pnpm lint:full
corepack pnpm typecheck

# Testing
corepack pnpm test:unit
corepack pnpm test:e2e
corepack pnpm test:integration:legacy-db
```

## Estado de calidad actual

- `lint:full` en verde
- `typecheck` en verde con verificacion estricta en `tsconfig.typecheck.json`
- Tests heredados adaptados a PostgreSQL real separados en
  `tests/integration/legacy-db`
- CI en `.github/workflows/ci.yml` (lint, typecheck, unit, audit, migrations,
  integration, e2e)
- Deploy en `.github/workflows/deploy.yml` solo corre si el CI de `main` termina
  en verde

## Testing

### Unit

```bash
corepack pnpm test:unit
corepack pnpm test:unit:watch
corepack pnpm test:unit:coverage
```

Ubicacion: `tests/unit/`

### E2E

```bash
corepack pnpm test:e2e
```

Ubicacion: `tests/e2e/`

### Integracion legacy con DB real

```bash
corepack pnpm test:integration:legacy-db
```

Ubicacion: `tests/integration/legacy-db/`

## Variables de entorno base

Copia `.env.example` a `.env` y rellena los valores:

```bash
cp .env.example .env
```

```env
NEXT_PUBLIC_BASE_URL=
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_SOCKET_URL=
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=lasmunecasderamon
DB_USER=postgres
DB_PASSWORD=
JWT_SECRET=
JWT_REFRESH_SECRET=
```

### Secrets de GitHub Actions

El workflow de CI/Deploy requiere estos secrets en el repositorio:

| Secret                              | Uso                                                                          |
| ----------------------------------- | ---------------------------------------------------------------------------- |
| `TEST_PASSWORD`                     | Opcional. Si no está definida, los tests e2e de login se omiten (no fallan). |
| `TEST_USER`                         | Opcional (default `admin`).                                                  |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Firma de tokens en CI/producción (≥64 chars).                                |
| `NEXT_PUBLIC_BASE_URL` / `BASE_URL` | URLs del entorno.                                                            |
| `SSH_PASSWORD`, `DB_*`, `TWILIO_*`  | Deploy al VPS (ver `deploy.yml`).                                            |

`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER` y
`ADMIN_WHATSAPP_NUMBER` se pueden editar en **Configuraciones → WhatsApp**: lo
guardado en la base manda y el `.env` queda como valor por defecto (campo vacío
= se usa la variable de entorno).

Nunca hardcodees passwords de test ni secretos en el repo; usa variables de
entorno.

## Flujo recomendado

```bash
corepack pnpm lint:full
corepack pnpm typecheck
corepack pnpm test:unit
corepack pnpm build
```

Si tocas flujos heredados con DB:

```bash
corepack pnpm test:integration:legacy-db
```

## Documentacion

- [docs/POSTGRESQL.md](docs/POSTGRESQL.md)
- [docs/INVENTARIO.md](docs/INVENTARIO.md)

## PostgreSQL

La aplicacion usa `pg`. Instalacion, migraciones, pruebas y recuperacion:
[guia de PostgreSQL](docs/POSTGRESQL.md).
