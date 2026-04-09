# Las Muñecas de Ramón Web

Aplicación **Next.js 16** que combina el sitio público y el panel operativo
interno.

## 🏗️ Arquitectura

El proyecto está migrando a una estructura **DDD (Domain-Driven Design)**:

```
src/
├── domains/           # Dominios DDD (en desarrollo)
│   ├── usuarios/     # users, clients, roles
│   ├── pedidos/      # orders, sales, products
│   ├── pagos/        # accounts, tips, commissions
│   ├── reportes/     # stats, payroll
│   └── asistencia/   # attendance, calendar
├── components/
│   └── common/       # Barrel exports de componentes
types/                # Tipos TypeScript globales
```

## 🚀 Scripts Principales

```bash
# Install
corepack pnpm install

# Desarrollo
corepack pnpm dev

# Calidad
pnpm lint              # ESLint
pnpm typecheck        # TypeScript
pnpm build            # Build producción

# Testing
pnpm test:unit        # Tests unitarios (Vitest)
pnpm test:unit:coverage  # Con coverage
pnpm test:e2e         # Tests E2E (Playwright)
pnpm test:ci          # Tests completos para CI

# Auditoría web
pnpm audit:web:quality
pnpm audit:web:quality:json
pnpm audit:web:quality:ci
```

## ✅ Calidad y Validaciones

| Script              | Descripción                                          |
| ------------------- | ---------------------------------------------------- |
| `lint`              | Revisa el código con ESLint compatible con Next 16   |
| `typecheck`         | Expone deuda de TypeScript sin ocultarla en el build |
| `test:unit`         | Tests unitarios con Vitest                           |
| `test:e2e`          | Tests E2E con Playwright                             |
| `audit:web:quality` | Auditoría de Performance, Accessibility, SEO         |

## 🧪 Testing

### Unit Tests (Vitest)

```bash
pnpm test:unit           # Ejecutar tests
pnpm test:unit:watch     # Modo watch
pnpm test:unit:coverage  # Con coverage report
```

Ubicación: `tests/unit/`

### E2E Tests (Playwright)

```bash
pnpm test:e2e           # Todos los tests
pnpm test:e2e:smoke      # Solo smoke tests
pnpm test:e2e:headed    # Con UI
```

Ubicación: `tests/e2e/`

## 📁 Estructura de Carpetas

| Carpeta        | Descripción                                            |
| -------------- | ------------------------------------------------------ |
| `app/`         | Next.js App Router páginas (+60 páginas)               |
| `components/`  | Componentes React (shadcn/ui + custom)                 |
| `lib/`         | Lógica de negocio, repositories, services, API helpers |
| `src/domains/` | Nueva estructura DDD (en migración)                    |
| `tests/`       | Tests unitarios y E2E                                  |
| `types/`       | Tipos TypeScript globales                              |
| `.agents/`     | Skills de agentes (QA, SEO, etc.)                      |

## 🌐 Variables de Entorno

```env
NEXT_PUBLIC_BASE_URL=
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_SOCKET_URL=
DB_HOST=
DB_USER=
DB_PASSWORD=
JWT_SECRET=
```

## 📋 Flujo de Desarrollo Recomendado

```bash
# 1. Lint
pnpm lint

# 2. TypeScript
pnpm typecheck

# 3. Tests unitarios
pnpm test:unit

# 4. Tests E2E (opcional en dev local)
pnpm test:e2e:smoke

# 5. Auditoría web (opcional)
pnpm audit:web:quality

# 6. Build
pnpm build
```

## 🤝 Contributing

Ver [CONTRIBUTING.md](./CONTRIBUTING.md) para guías de contribución.

## 📊 Plan de Mejoras

El proyecto tiene un plan de mejoras activo. Ver
[PLAN-MEJORAS.md](./PLAN-MEJORAS.md) para el estado actual.

## 📚 Documentación Adicional

- [Skill Web Quality](./.agents/skills/web-quality-audit/SKILL.md)
- [Plan de Mejoras](./PLAN-MEJORAS.md)
- [Contributing](./CONTRIBUTING.md)
