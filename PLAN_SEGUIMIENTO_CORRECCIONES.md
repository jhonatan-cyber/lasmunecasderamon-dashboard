# Plan De Seguimiento De Correcciones

Fecha: 2026-04-10

## Objetivo

Reducir riesgo funcional y tecnico en `lasmunecasderamon` y
`lasmunecasderamon-app`, empezando por autenticacion, seguridad basica,
reproducibilidad y disciplina de calidad.

## Fase 1. Critico

- [x] Corregir `registerFirstUser` para usar la contrasena recibida y no el
      `ci`.
- [x] Importar y usar correctamente `ConflictError` en el bootstrap del primer
      usuario.
- [x] Eliminar `multipleStatements: true` de la conexion MySQL.
- [x] Quitar en la app movil la dependencia funcional de `refreshToken` no
      implementado en backend.
- [x] Desactivar de forma explicita el flujo movil de `2FA` mientras el backend
      no exponga esos endpoints.

## Fase 2. Autenticacion Y Contrato API

- [x] Definir que el sistema actual operara con JWT simple de 24h hasta nuevo
      cambio de contrato.
- [ ] Si se mantiene 2FA, disenar el flujo completo y persistencia real en
      backend.
- [x] Documentar el contrato de `/api/auth/*` compartido entre web y movil.
- [x] Agregar tests del contrato auth para login, logout, `me` y
      `check-session`.

## Fase 3. Calidad Y Reproducibilidad

- [x] Reparar instalacion de dependencias en `lasmunecasderamon` para que
      `pnpm typecheck` y `pnpm lint` funcionen.
- [x] Endurecer TypeScript en web por etapas:
  - `strictNullChecks`
  - `noImplicitAny`
  - `strict`
- [x] Hacer que `lint:full` del repo web ejecute sin errores bloqueantes.
- [x] Reducir los warnings de `lint:full` (estado actual: 0 warnings, 0
      errores).
- [x] Limpiar artefactos generados del control de cambios:
  - `playwright-report`
  - `test-results`
  - `.idea`
  - binarios locales y carpetas temporales

## Fase 4. Testing

- [x] Separar tests realmente unitarios de tests que requieren MySQL real.
- [x] Mover tests dependientes de DB a una suite de integracion explicita.
- [ ] Ampliar la cobertura movil mas alla del smoke test actual.
- [x] Crear una verificacion minima de CI para web y movil.

## Fase 5. Mantenimiento

- [x] Unificar politica de package manager en movil (`pnpm` vs `npm`).
- [x] Revisar rutas API duplicadas o con naming inconsistente.
- [x] Retirar aliases legacy de rutas API ya migradas a canonicas.
- [ ] Reducir superficie de cambios abiertos antes de abordar refactors grandes.

## Cambios Aplicados En Esta Sesion

- Se corrigio el alta del primer usuario administrador.
- Se endurecio la configuracion de la conexion MySQL.
- Se alineo la app movil con el contrato auth realmente existente.
- Se definio formalmente el contrato auth actual como JWT-only.
- Se documento el contrato compartido entre backend web y app movil.
- Se anadieron tests unitarios para rutas auth del App Router.
- Se restauro la instalacion reproducible del proyecto web con
  node-linker=hoisted.
- `pnpm typecheck`, `pnpm lint`,
  `pnpm exec vitest run tests/unit/lib/api/auth-routes.test.ts` y
  `pnpm lint:full` vuelven a ejecutar correctamente.
- Se limpiaron los ultimos errores bloqueantes de ESLint en componentes y
  utilidades del proyecto web.
- Se movieron los tests JS heredados con dependencia de MySQL real a
  `tests/integration/legacy-db`.
- Se anadio el script `pnpm test:integration:legacy-db` para ejecutar esa suite
  explicita.
- Se anadio el workflow raiz `Quality Checks` en
  `.github/workflows/quality-checks.yml` para web y movil.
- El CI movil usa `pnpm` de forma explicita; la politica movil quedo unificada
  en torno a `pnpm`, retirando `package-lock.json` y artefactos locales del
  indice.
- Se actualizo `.gitignore` de la app movil para ignorar `package-lock.json`,
  `.idea/` y `test-results/`.
- La app movil mantiene `pnpm typecheck` y `pnpm lint` en verde tras la
  normalizacion del tooling.
- Se endurecio `tsconfig.typecheck.json` activando `strict`, `strictNullChecks`
  y `noImplicitAny` para la verificacion de web.
- Se documentaron duplicidades e inconsistencias de naming de API en
  `API_ROUTE_AUDIT.md`.
- Se actualizaron consumidores web y movil a rutas API canonicas para calendar,
  commissions, attendance y gratificaciones.
- Se marcaron rutas API legacy con headers de deprecacion y referencia explicita
  a su ruta canonica.
- Se eliminaron del backend los aliases legacy de calendar, gratificaciones,
  attendance y commissions al no quedar consumidores activos.
- Se valido que `src/domains/*` ya no tiene consumidores vivos y se retiro el
  residuo sin uso en `src/components/common`.
