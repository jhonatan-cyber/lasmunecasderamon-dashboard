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
| `TEST_PASSWORD`                     | Opcional. Si no está definida, los E2E crean un administrador efímero local. |
| `TEST_USER`                         | Opcional; solo aplica junto a `TEST_PASSWORD` (default `admin`).             |
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

## Flujo de cortesías (cajero y barman)

La entrada se cobra en la puerta y la bebida se entrega en la barra. Mientras la
cortesía está pendiente, la compra aparece en **Bar → Cortesías**; al confirmar
la entrega sale de la cola y el listado de **Entradas** muestra quién la entregó
y cuándo.

**Barman:** entrega desde **Bar → Cortesías**. **Cajero:** usa la misma cola o
el detalle de **Entradas** cuando el cliente cambia de bebida y hay que cobrar
un adicional.

### Ruta rápida

1. Abre **Bar → Cortesías**. La cola del día está agrupada por compra, no por
   persona.
2. Revisa cliente, cantidad de entradas, costo unitario y total.
3. Pulsa **Entregar** en la compra.
4. Elige la bebida de cada entrada. Puedes repetir el mismo producto o combinar
   varios; el total no puede superar las entradas pendientes.
5. Si la bebida es un **corte**, elige una analcohólica de cover. Si es una
   **botella**, elige las unidades de acompañamiento configuradas.
6. Confirma **Entregar N en la barra**. La cola se recarga y la compra
   desaparece si no quedan entradas pendientes.

### Qué permite cada pantalla

| Pantalla                  | Para qué                                                                   | Límite                                                                                                                         |
| ------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Bar → Cortesías**       | Cola del día agrupada por compra; entrega varias entradas de una sola vez. | Solo productos dentro del tope de cortesía. No cobra adicional.                                                                |
| **Entradas (`/tickets`)** | Detalle de una compra: entrega individual o todas las pendientes juntas.   | La entrega múltiple usa el tope de cortesía y no cobra adicional. La individual propone corte y permite botella con adicional. |

### Reglas de elegibilidad

| Tema             | Regla                                                                                                                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tope             | `monto_base_trago_cortesia_cliente` (Configuraciones → **Bar y comisiones** → **Reglas de venta** → **Covers de entradas**). Se usa el mayor entre ese tope y el monto pagado en la entrada.                 |
| Corte            | En **Bar → Cortesías** se ofrece si el precio del shot entra en el tope. Se prefiere sobre la botella cuando la bebida se vende por corte.                                                                   |
| Botella          | En **Bar → Cortesías** se ofrece solo si el precio sin anfitriona **y** el precio de venta que valida el servidor entran en el tope. En **Entradas** puedes elegir una botella mayor y cobrar la diferencia. |
| Bebida principal | No puede ser analcohólica ni cigarrillo; esas categorías se excluyen del listado de la cortesía.                                                                                                             |
| Cover            | Solo analcohólicas con `cover_habilitado` y stock. Un corte lleva **1 unidad**; una botella, las unidades configuradas en su opción de acompañamiento.                                                       |
| Sin cover        | Un corte puede entregarse sin cover si no hay stock. Una botella con acompañamiento configurado **no** se puede entregar sin cover.                                                                          |
| Varias unidades  | Si seleccionas 2 cortes del mismo producto, el cover debe tener stock para 2; si son 2 botellas con 2 acompañamientos, para 4.                                                                               |
| Pago             | Dentro del tope no se cobra en la barra. Con adicional, el total (entrada + adicional) queda como venta; el adicional se cobra en la barra.                                                                  |
| Inventario       | La cortesía descuenta stock como un movimiento `cortesia` a precio 0: ml del shot o una botella, más el cover. La venta con adicional descuenta como venta.                                                  |
| Estado           | `pendiente` → `entregada`; se guarda usuario y hora. `anulada` si la compra se anula.                                                                                                                        |
| Permiso          | `Entradas → Entregar` (`entradas:deliver`). Sin permiso el botón aparece como **Sin permiso**.                                                                                                               |

**Costo de entrada vs tope.** `costo_entrada` es lo que paga el cliente en la
puerta; el tope de la cortesía es `monto_base_trago_cortesia_cliente` ("Covers
de entradas"). Si ambos valores no coinciden, **Reglas de venta** muestra un
aviso: confírmalo con administración antes de operar.

### Errores frecuentes

- **No aparece un producto**: en **Bar → Cortesías** solo se listan los que
  están dentro del tope y con stock. También se excluyen analcohólicas y
  cigarrillos porque no son la bebida de la entrada.
- **No hay bebidas cover**: revisa el stock y que la analcohólica tenga
  `cover_habilitado`. Si es una botella que exige acompañamiento, no se puede
  cerrar la entrega sin cover.
- **"No se pudo entregar"**: la entrada pudo haber sido entregada o anulada por
  otra persona. Actualiza la cola; el servidor rechaza entregas duplicadas.
- **El adicional no aparece**: solo se registra como venta cuando es mayor
  que 0. Verifica el listado de Entradas y la caja.

### Antes de cerrar la entrega

- [ ] Cliente y cantidad de entradas coinciden con la compra.
- [ ] Cada producto está dentro del tope y tiene stock.
- [ ] Cada corte o botella que lo requiere tiene cover suficiente.
- [ ] La compra desapareció de **Bar → Cortesías** (o quedan solo las entradas
      que no se entregaron).
- [ ] Si hubo adicional, la venta quedó registrada.

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
