# Roadmap de mejora — lasmunecasderamon-dashboard

## Estado

| Fase                    | Trabajo                                                                                                                                | Estado                                                                                             |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1. Contención seguridad | Rotar secretos, purgar JWT de boneyard.config.json, quitar password hardcoded, ignorar backups/, añadir .env.example                   | ✅ Hecho (commit `27613a7`) — **falta rotar secretos en prod**                                     |
| 2. CI que protege       | lint:full real en CI (+ arreglar el error), Prettier check, deploy needs: ci, audit bloqueante, Node 22, unificar scripts/README       | ✅ Hecho (commit `aad425d`) — Node 24, 0 warnings                                                  |
| 3. Performance UI       | Arreglar deps/memo de TimerContext, memoizar Auth/Sidebar, dynamic-import de recharts en dashboard, virtualizar tablas grandes         | ✅ Hecho — memo completo, recharts lazy, tablas con React.memo (virtualización omitida: paginadas) |
| 4. Limpieza API/UI      | eliminar espejos dashboard/stats y rutas muertas, fix roles/setup, unificar DevolucionFilters/ConfirmModals, fusionar hooks duplicados | ⬜ Pendiente                                                                                       |
| 5. Datos                | índices audit_logs/error_logs, batch en N+1 críticos, renombrar migraciones 011/014, schemas zod en updates                            | ⬜ Pendiente                                                                                       |
| 6. A11y/SEO             | aria-live + aria-labels, dark mode, robots.ts/sitemap + noindex admin                                                                  | ⬜ Pendiente                                                                                       |
| 7. Tests                | tests de proxy.ts, servicios críticos (AuthService, StatsService), e2e de flujo de venta/caja                                          | ⬜ Pendiente                                                                                       |

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
- N+1 en datos: `RoomManager`, `TimerRepository.runAutoCleanup`,
  `InventoryRepository.generateUnits` (hasta 20 SELECTs/unidad),
  `PurchaseService` INSERT por fila.
- Falta índice en `audit_logs.created_at` y `error_logs.fecha_crea` (`ORDER BY`
  sin índice).

## 🟡 Código / deuda técnica

- Duplicación API: 7 pares espejo `/api/dashboard/*` ↔ `/api/stats/*` (mismo
  servicio); `/api/debug/slow-queries` ↔ `/api/monitoring/slow-queries`;
  `/api/caja-stats` triplicado.
- UI duplicada: `returns/{sales,services}/DevolucionFilters` 93% idénticos; 5
  `Delete*ConfirmModal` vs `shared/ConfirmModal`; `anfitriona-*` reimplementa lo
  que `cajero-*`/`garzon-*` resuelven con wrappers.
- Hooks muertos (4) y ~40 de uso único; carpetas `hooks/clients|clientes` y
  `hooks/sales|ventas` duplicadas.
- Componentes gigantes: `ProductForm.tsx` (924 líneas), `CommissionsReport`
  (673), `CuentaTable` (588).
- Endpoints rotos/sin consumidor: `POST /api/roles/setup` la UI la llama pero no
  existe (`app/roles/page.tsx:41-55`); ~10 rutas API sin llamadores
  (`cron/check-timers`, `events/*`, `auth/check-permission`…).
- Migraciones con prefijos duplicados `011_` y `014_` (orden lexicográfico
  ambiguo).
- Validación incompleta: `change-password` sin zod;
  Client/Commission/Overtime/User/Product `.update` con
  `Record<string,unknown>`/`any`; `loginSchema` mínimo.

## 🔵 Accesibilidad / SEO

- 64 botones solo-icono sin `aria-label`, 44 `<label>` sin `htmlFor>`, casi cero
  `aria-live`, `tabIndex=0` en `<span>` no interactivos.
- Dark mode roto en varios componentes (`text-gray-900` fijo sin `dark:`).
- SEO: solo 3 metadatos en 69 páginas; `robots: index:true` global incluye el
  panel admin; sin `sitemap.ts`/`robots.ts`.

## ⚪ Tests

- ~555 tests unit/pg/e2e, buena matriz de autorización estática… pero 5/399
  componentes, 0/69 páginas, e2e solo login; 21 servicios sin unit test;
  `proxy.ts` sin test directo.

---

## Plan por fases

| Fase                    | Trabajo                                                                                                                                | Esfuerzo   |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1. Contención seguridad | Rotar secretos, purgar JWT de boneyard.config.json, quitar password hardcoded, ignorar backups/, añadir .env.example                   | Bajo       |
| 2. CI que protege       | lint:full real en CI (+ arreglar el error), Prettier check, deploy needs: ci, audit bloqueante, Node 22, unificar scripts/README       | Bajo-medio |
| 3. Performance UI       | Arreglar deps/memo de TimerContext, memoizar Auth/Sidebar, dynamic-import de recharts en dashboard, virtualizar tablas grandes         | Medio      |
| 4. Limpieza API/UI      | eliminar espejos dashboard/stats y rutas muertas, fix roles/setup, unificar DevolucionFilters/ConfirmModals, fusionar hooks duplicados | Medio-alto |
| 5. Datos                | índices audit_logs/error_logs, batch en N+1 críticos, renombrar migraciones 011/014, schemas zod en updates                            | Medio      |
| 6. A11y/SEO             | aria-live + aria-labels, dark mode, robots.ts/sitemap + noindex admin                                                                  | Medio      |
| 7. Tests                | tests de proxy.ts, servicios críticos (AuthService, StatsService), e2e de flujo de venta/caja                                          | Medio      |
