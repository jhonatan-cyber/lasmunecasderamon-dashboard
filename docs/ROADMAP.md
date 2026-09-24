# Roadmap de mejora — lasmunecasderamon-dashboard

## Estado

| Fase                    | Trabajo                                                                                                                                | Estado                                                                                                   |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1. Contención seguridad | Rotar secretos, purgar JWT de boneyard.config.json, quitar password hardcoded, ignorar backups/, añadir .env.example                   | ✅ Hecho (commit `27613a7`) — **falta rotar secretos en prod**                                           |
| 2. CI que protege       | lint:full real en CI (+ arreglar el error), Prettier check, deploy needs: ci, audit bloqueante, Node 22, unificar scripts/README       | ✅ Hecho (commit `aad425d`) — Node 24, 0 warnings                                                        |
| 3. Performance UI       | Arreglar deps/memo de TimerContext, memoizar Auth/Sidebar, dynamic-import de recharts en dashboard, virtualizar tablas grandes         | ✅ Hecho — memo completo, recharts lazy, tablas con React.memo (virtualización omitida: paginadas)       |
| 4. Limpieza API/UI      | eliminar espejos dashboard/stats y rutas muertas, fix roles/setup, unificar DevolucionFilters/ConfirmModals, fusionar hooks duplicados | ✅ Hecho — 18 rutas borradas, roles/setup creado, UI unificada, hooks fusionados                         |
| 5. Datos                | índices audit_logs/error_logs, batch en N+1 críticos, renombrar migraciones 011/014, schemas zod en updates                            | ✅ Hecho — índices 029, N+1 batch (inventory/purchase/timers/rooms), migraciones 027/028, zod en updates |
| 6. A11y/SEO             | aria-live + aria-labels, dark mode, robots.ts/sitemap + noindex admin                                                                  | ✅ Hecho — robots/sitemap, noindex global, ~70 aria-labels, ~45 label/htmlFor, 17 aria-live, dark: fixes |
| 7. Tests                | tests de proxy.ts, servicios críticos (AuthService, StatsService), e2e de flujo de venta/caja                                          | ✅ Hecho — proxy 24, AuthService 14, StatsService 16, e2e venta-caja 12 (589 total)                      |

---

## 🔴 Crítico (seguridad)

- Secretos en historia de git: `.env` (JWT, Twilio, DB) aparece en ~15 commits
  históricos → rotar secretos y limpiar historia si el repo es
  público/compuesto.
- JWT de admin real commiteado en `boneyard.config.json:11,20` (expira 2027).
- Password `10571705` hardcodeada en `.github/workflows/ci.yml:252`,
  `tests/e2e/login.spec.ts:5`, `auth-loop.spec.ts:5`, `scripts/benchmark-*.mjs`.
- `backups/` NO está en `.gitignore` (solo `tests/integration/backups/`) → el
  dump pre-migración aparece como `?? backups/` y puede filtrarse.
- Seed admin `Cambio2026!` documentado en el dump de BD (mitigado por
  `force_password_change`, pero presente).
- Sin `.env.example` → onboarding frágil.

## 🟠 CI/Calidad (rotos o débiles)

- `pnpm lint` solo revisa 5 archivos; `lint:full` falla hoy (1 error:
  `lib/utils/image-utils.ts:1` `@ts-ignore`) y no corre en CI.
- Deploy no espera al CI → push a main despliega aunque fallen tests
  (`deploy.yml` en paralelo a `ci.yml`).
- Auditoría de seguridad no bloquea (`pnpm audit ... || true`).
- Node 20 en CI/deploy vs README que exige Node 22+; actions con versiones
  inconsistentes; `--no-frozen-lockfile` (builds no reproducibles).
- `.eslintrc.json` es config muerta (ESLint 9 usa `eslint.config.mjs`, con
  `no-explicit-any` y `no-unused-vars` apagados).
- Scripts rotos/duplicados: `optimize:images` (script inexistente),
  `typecheck`≡`typecheck:paths`, `test:unit`≡`test:ci`. README cita
  workflows/docs/scripts que no existen.

## 🟡 Rendimiento / UX

- ✅ `TimerContext` — deps completas, getters con `useCallback`, `formatTime` a
  nivel de módulo.
- ✅ `AuthContext`/`SidebarContext` — `value` con `useMemo`, acciones con
  `useCallback`.
- ✅ `recharts` dynamic-import en dashboard; `MiniSalesChart` fuera del bundle
  inicial.
- ✅ Tablas paginadas con `React.memo` en filas (ProductTable/CuentaTable) —
  virtualización no aplica.
- ✅ N+1 en datos: `RoomManager`, `TimerRepository.runAutoCleanup`,
  `InventoryRepository.generateUnits` (batch `generate_series` + multi-row
  INSERT), `PurchaseService` (validación IN + sync por producto + INSERT batch)
  (Fase 5).
- ✅ Índices en `audit_logs.created_at` y `error_logs.fecha_crea`
  (`migrations/029_audit_error_log_indexes.sql`, Fase 5).

## 🟡 Código / deuda técnica

- ✅ Duplicación API: espejos `/api/dashboard/*` ↔ `/api/stats/*`,
  `debug/slow-queries`, `caja-status` y rutas muertas eliminadas (Fase 4).
- ✅ UI duplicada: `DevolucionFilters` unificado; 5 `Delete*ConfirmModal` →
  `shared/DeleteConfirmModal` (Fase 4).
- `anfitriona-*` reimplementa lo que `cajero-*`/`garzon-*` resuelven con
  wrappers.
- ✅ Hooks: carpetas `clients|clientes` y `sales|ventas` fusionadas; hooks
  muertos de stats borrados (Fase 4).
- Componentes gigantes: `ProductForm.tsx` (924 líneas), `CommissionsReport`
  (673), `CuentaTable` (588).
- ✅ `POST /api/roles/setup` creado; rutas sin llamador (`events/*`,
  `auth/check-permission`) borradas. `cron/check-timers` se mantuvo: es el único
  emisor de
  `timer_warning_5m`/`timer_ended_event`/`updateSales`/`check_attendance` (Fase
  4).
- ✅ Migraciones con prefijos duplicados `011_` y `014_` renombradas a
  `027_`/`028_` (checksum adoption, Fase 5).
- ✅ Validación: `change-password` con `changePasswordSchema`;
  Client/Commission/Overtime/User/Product `.update` con zod partial;
  `loginSchema` con trim (Fase 5).

## 🔵 Accesibilidad / SEO

- ✅ ~70 botones solo-icono con `aria-label` (filtros, header, dropdowns, qty)
  (Fase 6).
- ✅ ~45 `<label>` con `htmlFor` + id en inputs (settings, forms, búsquedas)
  (Fase 6).
- ✅ 17 `aria-live`/`role=alert` en conteos, loading y errores;
  CollapsibleSection con `aria-expanded` (Fase 6).
- ✅ `tabIndex=0` removido de 7 `<span>` no interactivos (Fase 6).
- ✅ Dark mode: ~61 `dark:` variants agregados en tablas/headings/badges (Fase
  6).
- ✅ SEO: `app/robots.ts` + `app/sitemap.ts`; `robots: index:false` global;
  noindex en login/confirmar-*/asistencia-qr (Fase 6).

## ⚪ Tests

- ✅ Fase 7: `proxy.ts` (24 tests: públicas, auth, refresh, CORS, CSRF, kiosko,
  rate-limit, headers seguridad), `AuthService` (14), `StatsService` (16), e2e
  `venta-caja.spec.ts` (12: UI + guards 401 + APIs). 589 unit tests total.
- ~555→589 tests unit/pg/e2e, buena matriz de autorización estática… pero 5/399
  componentes, 0/69 páginas, e2e solo login+venta/caja; 21 servicios sin unit
  test; `proxy.ts` ahora con test directo ✅.

---

## Plan por fases

| Fase                    | Trabajo                                                                                                                                | Esfuerzo              |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| 1. Contención seguridad | Rotar secretos, purgar JWT de boneyard.config.json, quitar password hardcoded, ignorar backups/, añadir .env.example                   | Bajo                  |
| 2. CI que protege       | lint:full real en CI (+ arreglar el error), Prettier check, deploy needs: ci, audit bloqueante, Node 22, unificar scripts/README       | Bajo-medio            |
| 3. Performance UI       | Arreglar deps/memo de TimerContext, memoizar Auth/Sidebar, dynamic-import de recharts en dashboard, virtualizar tablas grandes         | Medio                 |
| 4. Limpieza API/UI      | eliminar espejos dashboard/stats y rutas muertas, fix roles/setup, unificar DevolucionFilters/ConfirmModals, fusionar hooks duplicados | Medio-alto            |
| 5. Datos                | índices audit_logs/error_logs, batch en N+1 críticos, renombrar migraciones 011/014, schemas zod en updates                            | ✅ Hecho (ver Estado) | Medio |
| 6. A11y/SEO             | aria-live + aria-labels, dark mode, robots.ts/sitemap + noindex admin                                                                  | ✅ Hecho (ver Estado) | Medio |
| 7. Tests                | tests de proxy.ts, servicios críticos (AuthService, StatsService), e2e de flujo de venta/caja                                          | ✅ Hecho (ver Estado) | Medio |
