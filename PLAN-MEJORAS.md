# Plan de Mejoras - lasmunecasderamon

## Estado: Planificado (SDD)

---

## Resumen Ejecutivo

El proyecto `lasmunecasderamon` presenta deuda técnica significativa:

- **+60 páginas** en un repositorio monolítico
- **~30 repositories** sin estructura de dominio
- **0% cobertura** de tests unitarios
- **Errores TypeScript** pendientes
- `tsconfig` con `strict: false`

Este plan aborda 5 iniciativas en 8 fases con **50 tareas** total.

---

## Iniciativas

### Iniciativa 1: Separar el Monolito

**Objetivo**: Crear estructura modular con 5 dominios funcionales

| Entregable                | Descripción                                              |
| ------------------------- | -------------------------------------------------------- |
| Estructura `src/domains/` | Carpetas: pedidos, inventario, usuarios, reportes, pagos |
| Componentes comunes       | `src/components/common/` con barrel exports              |
| Path aliases              | `@/domains/*` configurados en tsconfig                   |

### Iniciativa 2: TypeScript Debt

**Objetivo**: `tsc --noEmit` pasa sin errores + strict mode

| Entregable           | Descripción                 |
| -------------------- | --------------------------- |
| Errores documentados | `docs/typescript-errors.md` |
| `strict: true`       | Habilitado progresivamente  |
| CI typecheck         | Script en package.json      |

### Iniciativa 3: Testing Inexistente

**Objetivo**: Coverage >60% + 3 flujos E2E

| Entregable         | Descripción                                 |
| ------------------ | ------------------------------------------- |
| Vitest configurado | Test runner para unit tests                 |
| Playwright E2E     | 3 flujos: login, crear pedido, cerrar turno |
| Coverage report    | Badge en README                             |

### Iniciativa 4: DDD Repositories

**Objetivo**: Migrar ~30 repositories a estructura DDD

| Entregable              | Descripción                                  |
| ----------------------- | -------------------------------------------- |
| Estructura DDD          | `domain/`, `application/`, `infrastructure/` |
| Backwards compatibility | Proxies en `lib/repositories/legacy/`        |
| Tests unitarios         | Por cada repository migrado                  |

### Iniciativa 5: API Routes Centralizadas

**Objetivo**: Middleware compartido + validación Zod

| Entregable            | Descripción                |
| --------------------- | -------------------------- |
| `lib/api/middleware/` | auth, errorHandler, logger |
| `lib/schemas/`        | Contratos Zod compartidos  |
| Validación edge       | Zod en todas las routes    |

---

## Fases de Implementación

```
Phase 1 (Estructura Modular)     → Prerequisito para todo
Phase 2 (TypeScript)             → ||并行 a Phase 1
Phase 3 (Testing)                → Después de Phase 1
Phase 4 (DDD) + Phase 5 (API)   → En paralelo después de Phase 1
Phase 6 (E2E)                    → Después de código estable
Phase 7 (CI/CD)                  → Cuando funcione local
Phase 8 (Cleanup)                → Antes de release
```

---

## Tareas Detalladas

### Phase 1: Estructura Modular (Initiative 1)

- [ ] 1.1 Crear estructura de dominios en `src/domains/` con carpetas: pedidos,
      inventario, usuarios, reportes, pagos
- [ ] 1.2 Configurar `src/domains/index.ts` con exports barrel para cada dominio
- [ ] 1.3 Crear `src/components/common/` y mover componentes compartidos
      (Button, Input, Modal, Card, Table)
- [ ] 1.4 Crear barrel exports en `src/components/common/index.ts`
- [ ] 1.5 Actualizar `tsconfig.json` con paths adicionales: `@/domains/*` ->
      `src/domains/*`
- [ ] 1.6 Crear `src/domains/shared/` para tipos y utilidades cross-dominio
- [ ] 1.7 Migrar imports de `lib/` a `@/domains/` progresivamente con backwards
      compatibility

### Phase 2: TypeScript Debt (Initiative 2)

- [ ] 2.1 Ejecutar `npx tsc --noEmit` y documentar errores en
      `docs/typescript-errors.md`
- [ ] 2.2 Fixear error en `.next/dev/types/validator.ts` (regenerar con
      `next dev`)
- [ ] 2.3 Habilitar `strict: true` en `tsconfig.json` incremental:
      strictNullChecks primero
- [ ] 2.4 Agregar script `"typecheck:strict": "tsc --noEmit --strict"` a
      package.json
- [ ] 2.5 Crear `types/exact.d.ts` para tipos estrictos faltantes
- [ ] 2.6 Configurar CI: agregar `npm run typecheck` al workflow de GitHub

### Phase 3: Testing Infrastructure (Initiative 3)

- [ ] 3.1 Instalar `vitest` + `@vitest/coverage-v8` + `@testing-library/react`
- [ ] 3.2 Crear `vitest.config.ts` con setup para Next.js y coverage thresholds
- [ ] 3.3 Crear scripts en package.json: `"test": "vitest"`,
      `"test:coverage": "vitest --coverage"`
- [ ] 3.4 Crear `tests/setup/vitest-setup.ts` con mocks de Next.js y Redis
- [ ] 3.5 Agregar `"test:ci": "vitest run && playwright test"` a package.json
- [ ] 3.6 Crear primer test: `tests/unit/lib/utils/formatters.test.ts`

### Phase 4: DDD Repositories (Initiative 4)

- [ ] 4.1 Crear estructura DDD: `src/domains/{domain}/domain/`, `application/`,
      `infrastructure/`, `interfaces/`
- [ ] 4.2 Migrar UserRepository →
      `src/domains/usuarios/infrastructure/UserRepository.ts`
- [ ] 4.3 Migrar ClientRepository →
      `src/domains/usuarios/infrastructure/ClientRepository.ts`
- [ ] 4.4 Migrar OrderRepository →
      `src/domains/pedidos/infrastructure/OrderRepository.ts`
- [ ] 4.5 Migrar SaleRepository →
      `src/domains/pedidos/infrastructure/SaleRepository.ts`
- [ ] 4.6 Migrar ProductRepository →
      `src/domains/inventario/infrastructure/ProductRepository.ts`
- [ ] 4.7 Migrar ServiceRepository →
      `src/domains/inventario/infrastructure/ServiceRepository.ts`
- [ ] 4.8 Crear Application Services como capa de coordinación
- [ ] 4.9 Crear backwards compatibility proxies en `lib/repositories/legacy/`
      que delegan a nuevos repos
- [ ] 4.10 Escribir tests unitarios para cada repository migrado

### Phase 5: API Middleware + Zod (Initiative 5)

- [ ] 5.1 Crear `lib/api/middleware/auth.ts` como middleware compartido para
      todas las routes
- [ ] 5.2 Crear `lib/api/middleware/errorHandler.ts` centralizado
- [ ] 5.3 Crear `lib/api/middleware/logger.ts` para logging estructurado
- [ ] 5.4 Crear carpeta `lib/schemas/` con schemas Zod compartidos: auth.ts,
      common.ts, users.ts, orders.ts
- [ ] 5.5 Agregar validación Zod a `app/api/users/route.ts` como ejemplo
- [ ] 5.6 Crear `lib/api/validate.ts` helper para validar requests con Zod
- [ ] 5.7 Migrar validation de todas las routes nuevas a usar schemas
      compartidos
- [ ] 5.8 Documentar contratos de API en `docs/api-contracts.md`

### Phase 6: E2E Tests (Initiative 3 - continued)

- [x] 6.1 Crear test E2E: `tests/e2e/login.spec.ts` (flujo login exitoso +
      fallido)
- [x] 6.2 Crear test E2E: `tests/e2e/crear-pedido.spec.ts` (crear pedido nuevo)
- [x] 6.3 Crear test E2E: `tests/e2e/cerrar-turno.spec.ts` (cerrar caja)
- [x] 6.4 Configurar Playwright con baseURL dinámico para CI
- [x] 6.5 Agregar coverage report a CI: badge de coverage en README

### Phase 7: Integración CI/CD

- [x] 7.1 Actualizar `.github/workflows/ci.yml` con: lint → typecheck → vitest →
      playwright
- [ ] 7.2 Agregar step de coverage threshold (>60%) en CI
- [x] 7.3 Configurar fail-fast para typecheck antes de tests
- [ ] 7.4 Agregar badge de status de build en README

### Phase 8: Cleanup

- [x] 8.1 Eliminar código duplicado en `lib/` después de migración DDD
- [x] 8.2 Crear `CONTRIBUTING.md` con guía de contribución y estructura
- [x] 8.3 Actualizar README con nueva estructura de dominios
- [ ] 8.4 Taggear release "v2.0.0-rc.1" con todas las mejoras integradas

---

## Criterios de Éxito

- [ ] Initiative 1: Estructura modular creada con al menos 5 dominios separados,
      imports funcionando sin errores
- [ ] Initiative 2: `npx tsc --noEmit` pasa sin errores, `strict: true`
      habilitado
- [ ] Initiative 3: Coverage >60% en código de dominio, 3 flujos E2E pasando en
      CI
- [ ] Initiative 4: ~30 repositories migrated a estructura DDD, tests pasando
- [ ] Initiative 5: Middleware compartido usado en >80% de API routes,
      validación Zod en todas las routes nuevas
- [ ] CI/CD: Pipeline pasando con typecheck + tests + lint en menos de 5 minutos

---

## Riesgos y Mitigaciones

| Riesgo                        | Likelihood | Mitigación                             |
| ----------------------------- | ---------- | -------------------------------------- |
| Interrupciones en producción  | Medium     | Backwards compatibility, feature flags |
| Código inconsistente post-DDD | Medium     | Code review obligatorio                |
| Errores TypeScript acumulados | High       | typecheck diario                       |
| Tests flaky en CI             | Low        | Configurar retry                       |

---

## Rollback

Cada iniciativa tiene su propio script de rollback basado en git:

- **Initiative 1**: Branch `legacy/` con código original
- **Initiative 2**: Último `tsconfig.json` estable guardado
- **Initiative 3**: Tests additive sin modificar producción
- **Initiative 4**: Proxies en `lib/repositories/legacy/`
- **Initiative 5**: Cambios additive (no destructivos)

---

## Metadata

- **Creado**: 2026-04-09
- **SDD**: plan-mejoras
- **Proposal**: Engram #32
- **Tasks**: Engram #33
- **Total tareas**: 50
- **Fases**: 8
