# Contributing to Las Muñecas de Ramón

¡Gracias por tu interés en contribuir al proyecto! Este documento te ayudará a
entender la estructura del proyecto y cómo contribuir de manera efectiva.

## 🌟 Guías Generales

1. **Lee este documento** antes de contribuir
2. **Sigue los patrones existentes** del proyecto
3. **Escribe tests** para cualquier cambio significativo
4. **Commitea frecuentemente** con mensajes claros

## 🏗️ Estructura del Proyecto

```
lasmunecasderamon/
├── app/                    # Next.js App Router páginas
│   ├── api/               # API Routes
│   ├── login/             # Autenticación
│   ├── dashboard/         # Dashboard principal
│   └── ...                # Módulos (orders, sales, users, etc.)
├── components/            # Componentes React
│   ├── ui/                # Componentes shadcn/ui
│   ├── shared/            # Componentes compartidos
│   └── ...                # Componentes por módulo
├── lib/                   # Lógica de negocio
│   ├── repositories/      # Repositories (migrando a DDD)
│   ├── services/          # Servicios
│   ├── business/          # Utilidades de negocio
│   ├── api/               # API helpers y middleware
│   └── schemas/           # Schemas Zod
├── src/                   # Nueva estructura (DDD)
│   ├── domains/           # Dominios DDD
│   │   ├── usuarios/      # Dominio usuarios
│   │   ├── pedidos/       # Dominio pedidos
│   │   ├── pagos/         # Dominio pagos
│   │   ├── reportes/      # Dominio reportes
│   │   └── asistencia/   # Dominio asistencia
│   └── components/        # Componentes comunes
│       └── common/        # Barrel exports
├── tests/                 # Tests
│   ├── unit/             # Tests unitarios (Vitest)
│   ├── e2e/              # Tests E2E (Playwright)
│   └── setup/            # Configuración de tests
└── types/                 # Tipos TypeScript
```

## 🎯 Convenciones de Código

### TypeScript

- Usar `strict: false` por ahora (ver tsconfig.json)
- Preferir tipos explícitos en funciones públicas
- Usar interfaces para contratos, types para utilidades

### Componentes React

- Usar componentes de `shadcn/ui` como base
- Crear barrel exports en `src/components/common/`
- "Use client" solo cuando sea necesario (Server Components first)

### API Routes

- Usar middleware compartido en `lib/api/middleware/`
- Validar requests con Zod schemas en `lib/schemas/`
- Manejar errores con `handleApiError` de `lib/api/middleware/errorHandler.ts`

### DDD (Domain-Driven Design)

Los nuevos repositories van en:

```
src/domains/{dominio}/
├── domain/           # Entidades y value objects
├── application/     # Casos de uso
├── infrastructure/  # Implementaciones
└── interfaces/      # Contratos públicos
```

## 🧪 Testing

### Tests Unitarios (Vitest)

```bash
# Ejecutar tests
pnpm test:unit

# Con coverage
pnpm test:unit:coverage

# Modo watch
pnpm test:unit:watch
```

Ubicación: `tests/unit/**/*.test.{ts,tsx}`

### Tests E2E (Playwright)

```bash
# Ejecutar todos
pnpm test:e2e

# Solo smoke tests
pnpm test:e2e:smoke

# Con UI
pnpm test:e2e:headed
```

Ubicación: `tests/e2e/**/*.spec.ts`

## 📋 Scripts Disponibles

```bash
# Desarrollo
pnpm dev              # Iniciar servidor de desarrollo

# Calidad
pnpm lint             # ESLint
pnpm typecheck        # TypeScript
pnpm format           # Prettier

# Testing
pnpm test:unit        # Tests unitarios
pnpm test:unit:coverage # Con coverage
pnpm test:e2e         # Tests E2E
pnpm test:ci          # Tests completos para CI

# Base de datos
pnpm db:setup         # Setup de base de datos
pnpm db:import        # Importar datos de producción
```

## 🔧 Configuración de Desarrollo

### Variables de Entorno

Crea un archivo `.env.local` con las variables necesarias (consultar
`.env.example` o documentación).

### Puerto

El proyecto usa el puerto `3100` por defecto (configurable en
playwright.config.ts).

## 📝 Commits

Usamos conventional commits:

```
feat: nueva funcionalidad
fix: corrección de bug
docs: documentación
refactor: refactorización
test: agregar tests
chore: tareas de mantenimiento
```

Ejemplo: `feat: agregar validación Zod a orders API`

## 🚀 Pull Requests

1. Crear branch desde `main`: `git checkout -b feature/mi-feature`
2. Hacer cambios y commitear
3. Push y crear PR
4. Asegurar que CI pase (lint, typecheck, tests)
5. Solicitar review

## 📚 Recursos

- [Documentación del proyecto](./README.md)
- [Plan de Mejoras](./PLAN-MEJORAS.md)
- [Skill Web Quality](./.agents/skills/web-quality-audit/SKILL.md)

## ❓ ¿Preguntas?

Si tienes dudas, puedes:

- Abrir un issue para讨论
- Preguntar en el canal de desarrollo del equipo

---

¡Gracias por contribuir! 🎉
