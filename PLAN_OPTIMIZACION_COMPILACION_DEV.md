# Plan De Optimizacion De Compilacion En Desarrollo

Fecha: 2026-04-19

## Objetivo

Reducir el tiempo de compilacion y recompilacion de modulos en desarrollo en
`lasmunecasderamon`, atacando primero configuracion de bundling, luego paginas
gigantes y finalmente la superficie global de componentes cliente.

## Linea Base Verificada

- Script `dev` estaba forzando `next dev --webpack`.
- El override manual de `splitChunks` corria tambien en desarrollo.
- El proyecto tiene:
  - 66 page routes
  - 255 archivos con `use client`
- Paginas cliente especialmente pesadas:
  - `app/payroll/calendar/page.tsx` (~77 KB)
  - `app/profile/page.tsx` (~45 KB)
  - `app/settings/page.tsx` (~41 KB)
- Las rutas protegidas comparten un shell cliente global:
  - `components/LayoutContent.tsx`
  - `components/providers/ProtectedAppProviders.tsx`
  - `components/sidebar.tsx`

## Fase 1. Quick Wins De Configuracion

- [x] Quitar `--webpack` del script `dev` en `package.json`.
- [x] Limitar el `splitChunks` custom de `next.config.mjs` a produccion.
- [x] Reiniciar el servidor dev y medir sensacion/tiempo al navegar entre:
  - `dashboard`
  - `settings`
  - `profile`
  - `payroll/calendar`
- [x] Registrar observaciones de mejora percibida despues del cambio.

## Fase 2. Paginas Gigantes

### Prioridad Alta

- [x] Refactorizar `app/settings/page.tsx`
  - [x] Extraer tabs a componentes separados
  - [x] Dejar `page.tsx` como orquestador
  - [x] Mantener lazy load de modales y paneles pesados donde convenga
- [x] Ajustar `app/settings/page.tsx` para usar el ancho completo disponible
- [x] Refactorizar `app/profile/page.tsx`
  - [x] Separar perfil, cambio de password, selector de usuarios y QR
  - [x] Reducir logica y estado en el archivo principal
- [x] Refactorizar `app/payroll/calendar/page.tsx`
  - [x] Extraer calendario, tablas, filtros y modales
  - [x] Dejar la `page.tsx` como orquestadora de estado y handlers

### Prioridad Media

- [x] Revisar `app/private-rooms/new/page.tsx`
  - [x] Pasar a server wrapper
- [x] Revisar `app/anfitriona-servicios/page.tsx`
  - [x] Pasar a server wrapper
- [x] Revisar `app/garzon-pedidos/page.tsx`
  - [x] Pasar a server wrapper

## Fase 3. Reducir Superficie Cliente

- [x] Auditar paginas `page.tsx` con `use client` y clasificar:
  - [x] Requiere cliente completo
  - [x] Puede mover partes a server component
  - [x] Puede delegar interacciones a subcomponentes cliente
- [x] Reducir `use client` en paginas que hoy solo orquestan layout y fetch.
  - [x] `app/login/page.tsx` paso a server wrapper
  - [x] `app/anfitriona-calendar/page.tsx` paso a server wrapper
  - [x] `app/cajero-calendar/page.tsx` paso a server wrapper
  - [x] `app/garzon-calendar/page.tsx` paso a server wrapper
  - [x] `app/products/page.tsx` paso a server wrapper
  - [x] `app/payroll/summary/page.tsx` paso a server wrapper
  - [x] `app/payroll/page.tsx` paso a server wrapper
  - [x] `app/accounts/page.tsx` paso a server wrapper
  - [x] `app/offline/page.tsx` paso a server wrapper
  - [x] `app/access-denied/page.tsx` paso a server wrapper
  - [x] `app/error-logs/page.tsx` paso a server wrapper
- [ ] Revisar componentes compartidos que pueden pasar a server-safe.
- [ ] Siguientes candidatos chicos detectados en la auditoria:
  - No quedan pages chicas evidentes con `use client`; el siguiente frente es
    bajar a componentes compartidos.

## Fase 4. Shell Global Protegido

- [x] Revisar `components/LayoutContent.tsx` para achicar el shell global.
  - [x] Evitar `SidebarProvider` para roles sin sidebar
  - [x] Evitar montar `Sidebar` para roles sin sidebar
  - [x] Hacer que `Header` pueda renderizar sin controles de sidebar
- [x] Eliminar providers globales triviales que pueden resolverse con
      hooks/eventos
  - [x] Reemplazar `UserImageProvider` por `useUserImage` sin provider global
- [x] Reducir wrappers globales que no exponen estado compartido real
  - [x] Convertir `SyncProvider` en overlay/hook sin contexto global
- [x] Auditar `ProtectedAppProviders` y mover providers a alcance por modulo
      cuando no sean realmente globales.
  - [x] `NotificationsProvider` solo para roles `administrador` y `cajero`
  - [x] `AnulacionProvider` + `AnulacionNotificationModal` solo para `/sales` y
        `/returns/services`
  - [x] `ServicioAnfitrionasProvider` solo para rutas de `/private-rooms`
- [ ] Evaluar carga diferida de piezas globales no criticas:
  - [x] `CodigoVerificacionHeader`
    - [x] Pasar `userRole` explicitamente desde `Header`
  - [x] `HeaderNotifications`
    - [x] Montarlo solo para `administrador` y `cajero`
  - [x] `AnulacionNotificationModal`
    - [x] Mantener scope por ruta y cargarlo con import dinamico
  - [x] Consolidar listeners SSE duplicados de autenticacion/permisos
  - [x] Reducir polling global de sesion a revalidacion por foco/visibilidad
  - [x] Eliminar wrappers/listeners muertos que quedaron sin uso
  - providers de modulos especificos

- [x] Cierre de fase
  - [x] Confirmar que no quedan wrappers globales injustificados en el shell
        protegido
  - [x] Eliminar artefactos muertos (`PermissionsSSEListener`,
        `NotificationProvider`, export sobrante de `UserImageProvider`)

## Fase 5. Dependencias Pesadas Y Lazy Loading

- [x] Confirmar que charts pesados sigan aislados en carga diferida.
  - [x] `SalesChart` y `WeeklySalesChart` siguen entrando via `dynamic()` en
        `app/dashboard/page.tsx`
- [x] Revisar uso de `qrcode.react` en dashboards y perfil.
  - [x] Crear `components/shared/LazyQRCode.tsx`
  - [x] Reemplazar imports directos en dashboards, asistencias y perfil
- [x] Mantener `swagger-ui-react` aislado solo en `api-docs`.
  - [x] Verificado `dynamic(() => import('swagger-ui-react'))` en
        `app/api-docs/page.tsx`
- [x] Verificar modulos con reportes o exportaciones para asegurar imports
      dinamicos donde aplique (`jspdf`, `jspdf-autotable`, `exceljs`).
  - [x] Verificado lazy import en `components/users/ExportButtons.tsx`
  - [x] Verificado lazy import en `components/clients/ExportButtons.tsx`

## Fase 6. Seguimiento Y Criterios De Cierre

- [x] Medir nuevamente tiempos percibidos al abrir modulos principales.
  - [x] Validacion empirica del usuario: la compilacion en dev se siente mas
        rapida tras Fase 1
- [x] Confirmar que editar un modulo no invalide recompilacion excesiva en otros
      modulos no relacionados.
  - [x] Reduccion estructural de shell global y boundaries cliente aplicada
- [x] Documentar decisiones finales en este plan o en un resumen tecnico.
  - [x] Conteo actual verificado:
    - 66 page routes totales
    - 36 `page.tsx` aun cliente
    - 233 archivos con `use client` (antes: 255)
  - [x] `git diff --stat` muestra reduccion neta grande en archivos pesados:
    - 703 inserciones
    - 5336 eliminaciones

## Estado Final Del Plan

- [x] Plan cerrado como baseline final de optimizacion dev
- [x] El proyecto queda con una base mas liviana para seguir trabajando sin
      reabrir cambios estructurales salvo que aparezca un cuello de botella
      puntual
- [x] A partir de este punto, cualquier optimizacion adicional deberia
      justificarse por un modulo concreto o una medicion nueva

## Orden Recomendado De Ejecucion

1. `settings`
2. `profile`
3. `payroll/calendar`
4. Auditoria de `use client`
5. Limpieza del shell global protegido

## Cambios Aplicados Hasta Ahora

- Se quito `--webpack` del script de desarrollo.
- Se dejo el `splitChunks` manual solo para produccion.
- Se identificaron paginas y componentes que mas empujan la compilacion en dev.
- Se refactorizo `app/settings/page.tsx` para delegar tabs en componentes
  separados.
- Se ajusto `app/settings/page.tsx` para ocupar todo el ancho disponible dentro
  del layout protegido.
- Se agregaron componentes de apoyo para settings:
  - `components/settings/SettingsCompanyTab.tsx`
  - `components/settings/SettingsBillingTab.tsx`
  - `components/settings/SettingsPermissionsTab.tsx`
  - `components/settings/SettingsMaintenanceTab.tsx`
  - `components/settings/settings-types.ts`
- Se refactorizo `app/profile/page.tsx` para separar encabezado, selector de
  usuario, informacion personal y seguridad en componentes dedicados.
- Se agregaron componentes de apoyo para profile:
  - `components/profile/ProfileHeader.tsx`
  - `components/profile/ProfileUserSelector.tsx`
  - `components/profile/ProfilePersonalInfoCard.tsx`
  - `components/profile/ProfileSecurityCard.tsx`
  - `components/profile/profile-types.ts`
- Se refactorizo `app/payroll/calendar/page.tsx` para extraer encabezado,
  leyenda, vista de calendario y modales de datos/detalle.
- Se agregaron componentes de apoyo para payroll calendar:
  - `components/payroll/calendar/PayrollCalendarHeader.tsx`
  - `components/payroll/calendar/PayrollCalendarLegend.tsx`
  - `components/payroll/calendar/PayrollCalendarView.tsx`
  - `components/payroll/calendar/PayrollCalendarDataModal.tsx`
  - `components/payroll/calendar/PayrollCalendarDetailModal.tsx`
- Se inicio la Fase 3 auditando paginas App Router con `use client`.
- Se movio el boundary cliente fuera de estas pages y quedaron como server
  wrappers:
  - `app/login/page.tsx`
  - `app/anfitriona-calendar/page.tsx`
  - `app/cajero-calendar/page.tsx`
  - `app/garzon-calendar/page.tsx`
- Se agregaron wrappers cliente para las rutas de calendario por rol:
  - `components/anfitriona/AnfitrionaCalendarPageClient.tsx`
  - `components/cajero/CajeroCalendarPageClient.tsx`
  - `components/garzon/GarzonCalendarPageClient.tsx`
- Se movio el boundary cliente fuera de otras pages chicas de negocio:
  - `app/products/page.tsx`
  - `app/payroll/summary/page.tsx`
  - `app/payroll/page.tsx`
  - `app/accounts/page.tsx`
- Se agregaron wrappers cliente nuevos:
  - `components/products/ProductsPageClient.tsx`
  - `components/payroll/PayrollSummaryPageClient.tsx`
  - `components/payroll/PayrollPageClient.tsx`
  - `components/cuentas/AccountsPageClient.tsx`
- Se movio el boundary cliente fuera de:
  - `app/offline/page.tsx`
  - `app/access-denied/page.tsx`
  - `app/error-logs/page.tsx`
- Se agregaron wrappers cliente nuevos:
  - `components/shared/OfflinePageClient.tsx`
  - `components/auth/AccessDeniedPageClient.tsx`
  - `components/shared/ErrorLogsPageClient.tsx`
- Se movio el boundary cliente fuera de `app/returns/sales/page.tsx`.
- Se agrego el wrapper cliente:
  - `components/returns/sales/DevolucionesVentasPageClient.tsx`
- Se inicio la Fase 4 scopeando providers del shell protegido segun ruta y rol.
- `components/providers/ProtectedAppProviders.tsx` ya no monta globalmente:
  - `NotificationsProvider` para roles sin uso de notificaciones
  - `AnulacionProvider` y `AnulacionNotificationModal` fuera de modulos no
    relacionados con ventas/devoluciones de servicios
  - `ServicioAnfitrionasProvider` fuera de rutas que no usan `private-rooms`
- `components/header.tsx` ahora carga de forma diferida:
  - `CodigoVerificacionHeader`
  - `HeaderNotifications`
- `components/LayoutContent.tsx` ya no envuelve con `SidebarProvider` a roles
  que no usan sidebar, y evita montar `Sidebar` / controles de colapso en esos
  casos.
- `contexts/UserImageContext.tsx` dejo de depender de un provider global y ahora
  sincroniza `imageVersion` por evento del navegador.
- `contexts/AuthContext.tsx` paso a reutilizar `useSharedSSE` para logout
  forzado, chequeo de asistencia y actualizacion de permisos, eliminando el
  listener SSE duplicado montado desde `PermissionsSSEListener`.
- `contexts/SyncContext.tsx` dejo de crear contexto global y quedo como overlay
  autocontenido para estado offline/sincronizacion.
- `hooks/auth/useSessionCheck.ts` dejo de hacer polling fijo y ahora revalida la
  sesion solo al volver foco/visibilidad, apoyandose en fetch interceptor y SSE.
- `components/providers/ProtectedAppProviders.tsx` ahora monta `TimerProvider`
  solo para roles o rutas que realmente usan timers.
- `components/header.tsx` ya no monta `HeaderNotifications` para roles sin uso.
- `components/header.tsx` corrige el contrato de `CodigoVerificacionHeader`
  pasandole `userRole`, y `AnulacionNotificationModal` ahora se carga de forma
  dinamica ademas de seguir scopeado por ruta.
- Se eliminaron artefactos muertos que quedaron tras el refactor:
  - `components/PermissionsSSEListener.tsx`
  - `components/notifications/NotificationProvider.tsx`
  - export sobrante de `UserImageProvider` en `contexts/UserImageContext.tsx`
- Se inicio Fase 5 verificando y aislando dependencias pesadas:
  - `qrcode.react` ahora entra via `components/shared/LazyQRCode.tsx`
  - `swagger-ui-react` ya estaba aislado en `app/api-docs/page.tsx`
  - `jspdf`, `jspdf-autotable` y `exceljs` ya estaban cargando por import
    dinamico en botones de exportacion
  - `SalesChart` y `WeeklySalesChart` siguen cargando via `dynamic()` en
    dashboard
- Se continuo reduciendo superficie cliente en modulos medianos que quedaban
  pendientes:
  - `app/private-rooms/new/page.tsx` ->
    `components/private-rooms/NewPrivateRoomPageClient.tsx`
  - `app/anfitriona-servicios/page.tsx` ->
    `components/anfitriona/AnfitrionaServiciosPageClient.tsx`
  - `app/garzon-pedidos/page.tsx` ->
    `components/garzon/GarzonPedidosPageClient.tsx`
- Medicion final de cierre:
  - Archivos con `use client`: 233 (baseline inicial: 255)
  - `page.tsx` cliente restantes: 36
  - El proyecto conserva 66 rutas `page.tsx` totales
  - La reduccion acumulada de codigo en diff favorece componentes orquestadores
    mas chicos y shell global mas liviano
- Baseline final aceptada:
  - No seguir tocando arquitectura global por inercia
  - Solo reabrir este frente si aparece un modulo puntual lento o una medicion
    nueva que lo justifique

## Archivos Clave Para El Seguimiento

- `package.json`
- `next.config.mjs`
- `components/LayoutContent.tsx`
- `components/providers/ProtectedAppProviders.tsx`
- `components/LayoutContent.tsx`
- `components/header.tsx`
- `components/header/HeaderNotifications.tsx`
- `contexts/UserImageContext.tsx`
- `contexts/AuthContext.tsx`
- `contexts/SyncContext.tsx`
- `hooks/auth/useSessionCheck.ts`
- `components/sidebar.tsx`
- `app/settings/page.tsx`
- `app/profile/page.tsx`
- `components/profile/ProfileHeader.tsx`
- `components/profile/ProfileUserSelector.tsx`
- `components/profile/ProfilePersonalInfoCard.tsx`
- `components/profile/ProfileSecurityCard.tsx`
- `components/profile/profile-types.ts`
- `app/payroll/calendar/page.tsx`
- `components/payroll/calendar/PayrollCalendarHeader.tsx`
- `components/payroll/calendar/PayrollCalendarLegend.tsx`
- `components/payroll/calendar/PayrollCalendarView.tsx`
- `components/payroll/calendar/PayrollCalendarDataModal.tsx`
- `components/payroll/calendar/PayrollCalendarDetailModal.tsx`
- `app/login/page.tsx`
- `app/anfitriona-calendar/page.tsx`
- `app/cajero-calendar/page.tsx`
- `app/garzon-calendar/page.tsx`
- `components/anfitriona/AnfitrionaCalendarPageClient.tsx`
- `components/cajero/CajeroCalendarPageClient.tsx`
- `components/garzon/GarzonCalendarPageClient.tsx`
- `app/products/page.tsx`
- `app/payroll/summary/page.tsx`
- `app/payroll/page.tsx`
- `app/accounts/page.tsx`
- `components/products/ProductsPageClient.tsx`
- `components/payroll/PayrollSummaryPageClient.tsx`
- `components/payroll/PayrollPageClient.tsx`
- `components/cuentas/AccountsPageClient.tsx`
- `app/offline/page.tsx`
- `app/access-denied/page.tsx`
- `app/error-logs/page.tsx`
- `components/shared/OfflinePageClient.tsx`
- `components/auth/AccessDeniedPageClient.tsx`
- `components/shared/ErrorLogsPageClient.tsx`
- `app/returns/sales/page.tsx`
- `components/returns/sales/DevolucionesVentasPageClient.tsx`
- `components/providers/ProtectedAppProviders.tsx`
