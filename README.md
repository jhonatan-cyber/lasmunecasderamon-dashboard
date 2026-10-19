# Las Munecas de Ramon Web

Aplicacion `Next.js 16` que combina sitio publico y panel operativo interno.

## Arquitectura

El proyecto es un monolito modular: un despliegue de Next.js y una base
PostgreSQL, con límites por dominio.

```text
app/api/          # Rutas App Router / API
components/       # UI y componentes por modulo
hooks/            # Hooks de dominio y UI
modules/          # APIs públicas, contratos y persistencia privada de cada dominio
workflows/        # Coordinación de casos de uso entre módulos
lib/database/     # Pool PostgreSQL y transacciones
tests/            # Unit, integration, e2e
types/            # Tipos TypeScript globales
```

Los consumidores usan `modules/<dominio>/index.ts` y, cuando el dominio lo
expone, `modules/<dominio>/contracts.ts`. El control `pnpm arquitectura:limites`
bloquea imports privados, ciclos y escrituras en tablas ajenas. El detalle está
en la [revisión de módulos](docs/REVISION_MODULOS_2026-10-07.md) y la
[línea base de consultas por flujo](docs/arquitectura/LINEA_BASE_FLUJOS.md).

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

# Arquitectura y base de datos
corepack pnpm arquitectura:limites
corepack pnpm db:migrate

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

## Documentación

- [CI/CD](docs/CI_CD.md)
- [Componentes de UI](docs/UI_COMPONENTS.md)
- [Revisión de módulos](docs/REVISION_MODULOS_2026-10-07.md)
- [Arquitectura: línea base de consultas](docs/arquitectura/LINEA_BASE_FLUJOS.md)
- [Imágenes de productos](docs/imagenes-productos.md)

## PostgreSQL

La aplicacion usa `pg`. La conexion se configura en `.env` (`DB_HOST`,
`DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`) y las migraciones se aplican con
`pnpm db:migrate` (`pnpm db:plan` para previsualizar). Las pruebas que necesitan
base real estan descritas en [CI/CD](docs/CI_CD.md).
