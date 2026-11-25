# Diagnóstico de arquitectura — Fase 0

Generado por `scripts/arquitectura/analisis.mjs`. No modificar a mano.

| Métrica                                    | Valor |
| ------------------------------------------ | ----- |
| Archivos analizados                        | 2348  |
| Rutas HTTP                                 | 247   |
| **Rutas con SQL directo**                  | **0** |
| **Archivos con SQL fuera de repositorios** | **0** |
| Tablas con más de un escritor              | 0     |
| Ciclos entre dominios                      | 0     |
| Procesos periódicos                        | 21    |
| Puntos de caché                            | 32    |
| Rutas sin `withRoute`                      | 23    |

## 1. SQL fuera de repositorios

Objetivo del plan (§3.3 y §5): el SQL queda en infraestructura, los
controladores HTTP traducen. Esto es lo que hay que reducir a cero.

_(sin resultados)_

<details><summary>Detalle por archivo</summary>

_(sin resultados)_

</details>

## 2. Propiedad de tablas

Tablas que escriben más de un repositorio. Son las escrituras cruzadas que el
principio 1 del plan quiere eliminar: cada tabla debería tener un único módulo
propietario.

_(sin resultados)_

## 3. Ciclos entre dominios

_No se detectaron ciclos en el grafo de dominios._

## 4. Transacciones

| Archivo con withTransaction/enUnaUnidad              | Capa                    |
| ---------------------------------------------------- | ----------------------- |
| modules/inventario/reconciliacion/repositorio.ts     | modules/infraestructura |
| app/api/hostesses/[id]/release/route.ts              | app/api                 |
| lib/database/maintenance.ts                          | lib/database            |
| lib/transaction/contract.ts                          | lib/otros               |
| modules/asistencia/biometrico/enrollmentService.ts   | modules/aplicacion      |
| modules/asistencia/biometrico/unenrollmentService.ts | modules/aplicacion      |
| modules/asistencia/kioskos/deviceAuth.ts             | modules/aplicacion      |
| modules/asistencia/marcas/repositorio.ts             | modules/infraestructura |
| modules/caja/retiros/servicio.ts                     | modules/aplicacion      |
| modules/caja/turnos/repositorio.ts                   | modules/infraestructura |
| modules/colaciones/repositorio.ts                    | modules/infraestructura |
| modules/entradas/repositorio.ts                      | modules/infraestructura |
| modules/identidad/autenticacion/consultas.ts         | modules/infraestructura |
| modules/identidad/permisos/repositorio.ts            | modules/infraestructura |
| modules/identidad/roles/registro.ts                  | modules/infraestructura |
| modules/inventario/anulaciones/infraestructura.ts    | modules/infraestructura |
| modules/inventario/bar/stockRepositorio.ts           | modules/infraestructura |
| modules/inventario/categorias/repositorio.ts         | modules/infraestructura |
| modules/inventario/compras/servicio.ts               | modules/aplicacion      |
| modules/inventario/envases/infraestructura.ts        | modules/infraestructura |
| modules/inventario/limpieza/servicio.ts              | modules/aplicacion      |
| modules/inventario/mermas/servicio.ts                | modules/aplicacion      |
| modules/inventario/presentaciones/infraestructura.ts | modules/infraestructura |
| modules/inventario/presentaciones/repositorio.ts     | modules/infraestructura |
| modules/inventario/productos/repositorio.ts          | modules/infraestructura |
| modules/inventario/productos/servicio.ts             | modules/aplicacion      |
| modules/inventario/reposicion/servicio.ts            | modules/aplicacion      |
| modules/inventario/transferencias/infraestructura.ts | modules/infraestructura |
| modules/inventario/unidades/infraestructura.ts       | modules/infraestructura |
| modules/operacion/cuentas/actualizacion.ts           | modules/aplicacion      |
| modules/operacion/cuentas/alta.ts                    | modules/aplicacion      |
| modules/operacion/cuentas/anulacionesServicio.ts     | modules/aplicacion      |
| modules/operacion/cuentas/consultas.ts               | modules/infraestructura |
| modules/operacion/cuentas/repositorio.ts             | modules/infraestructura |
| modules/operacion/cuentas/servicio.ts                | modules/aplicacion      |
| modules/operacion/cuentas/temporizadores.ts          | modules/aplicacion      |
| modules/operacion/habitaciones/repositorio.ts        | modules/infraestructura |
| modules/operacion/pedidos/repositorio.ts             | modules/infraestructura |
| modules/operacion/servicios/anulaciones.ts           | modules/aplicacion      |
| modules/operacion/servicios/asignaciones.ts          | modules/aplicacion      |
| modules/operacion/servicios/creacion.ts              | modules/aplicacion      |
| modules/operacion/servicios/servicio.ts              | modules/aplicacion      |
| modules/operacion/solicitudes/repositorio.ts         | modules/infraestructura |
| modules/operacion/temporizadores/fachada.ts          | modules/aplicacion      |
| modules/operacion/temporizadores/servicio.ts         | modules/aplicacion      |
| modules/personal/anticipos/repositorio.ts            | modules/infraestructura |
| modules/personal/anticipos/servicio.ts               | modules/aplicacion      |
| modules/personal/conceptos/propinas.ts               | modules/aplicacion      |
| modules/personal/gratificaciones/consultas.ts        | modules/infraestructura |
| modules/personal/nomina/servicio.ts                  | modules/aplicacion      |
| workflows/anulaciones-entrada.ts                     | workflows               |
| workflows/anulaciones-venta.ts                       | workflows               |
| workflows/anulaciones-whatsapp.ts                    | workflows               |
| workflows/cobrar-cuenta.ts                           | workflows               |
| workflows/eliminar-usuario.ts                        | workflows               |
| workflows/prepago.ts                                 | workflows               |
| workflows/reservas-quincho.ts                        | workflows               |
| workflows/ventas.ts                                  | workflows               |

## 5. Procesos periódicos y ciclo de vida

Deben pasar a tener un ciclo de vida explícito al migrar Asistencia (fase 3).

| Archivo                                           | Línea | Código                                                                    |
| ------------------------------------------------- | ----- | ------------------------------------------------------------------------- |
| app/api/notifications/kiosk/route.ts              | 30    | const interval = setInterval(() => {                                      |
| app/attendance-qr/page.tsx                        | 149   | const intervalo = setInterval(() => cargarTablero(true), 60_000);         |
| app/attendance-qr/page.tsx                        | 156   | const intervalo = setInterval(() => {                                     |
| app/biometrico/prueba/page.tsx                    | 122   | const id = window.setInterval(() => {                                     |
| app/tickets/page.tsx                              | 195   | const interval = window.setInterval(actualizarFechaHora, 60_000);         |
| components/attendance/QrCodeDialog.tsx            | 80    | const intervalo = setInterval(() => {                                     |
| components/cash-register/CajaFormDialog.tsx       | 46    | const timer = setInterval(() => {                                         |
| components/cleaning/CleaningInventory.tsx         | 103   | const interval = window.setInterval(refresh, 30000);                      |
| components/clients/DevolucionSolicitudesModal.tsx | 55    | const id = setInterval(fetchSolicitudes, 15000);                          |
| components/meals/ColacionesTab.tsx                | 309   | const id = setInterval(() => setAhora(Date.now()), 15_000);               |
| components/products/ContainerReturnsPanel.tsx     | 170   | const intervalo = setInterval(fetchResumen, 60_000);                      |
| components/settings/BiometricStatus.tsx           | 104   | const intervalo = setInterval(() => void load(), 30_000);                 |
| components/settings/SettingsWhatsAppTab.tsx       | 105   | const timer = setInterval(() => {                                         |
| hooks/shared/useSSE.ts                            | 23    | const interval = setInterval(() => {                                      |
| hooks/timers/useTimerAudio.ts                     | 12    | const interval = setInterval(() => {                                      |
| hooks/timers/useTimerSync.ts                      | 99    | const interval = window.setInterval(onVisible, 120_000);                  |
| lib/api/rateLimit.ts                              | 22    | this.cleanupInterval = setInterval(() => this.cleanup(), this.cleanupMs); |
| lib/api/sseService.ts                             | 88    | this.heartbeatInterval = setInterval(() => {                              |
| lib/store/timerStore.ts                           | 148   | tickInterval = setInterval(() => {                                        |
| modules/asistencia/biometrico/ipWatcher.ts        | 116   | estado.timer = setInterval(arrancar, intervaloVigilanciaIp());            |
| modules/asistencia/biometrico/recordPoller.ts     | 329   | estado.timer = setInterval(() => {                                        |

## 6. Cachés

| Archivo                                               | Línea | Tipo                                                                      |
| ----------------------------------------------------- | ----- | ------------------------------------------------------------------------- |
| lib/api/sseBus.ts                                     | 112   | publisher = new Redis(process.env.REDIS_URL!, options);                   |
| lib/api/sseBus.ts                                     | 113   | subscriber = new Redis(process.env.REDIS_URL!, options);                  |
| lib/auth/permissions-cache.ts                         | 101   | client = new Redis(this.url, {                                            |
| lib/cache/failedLoginStore.ts                         | 111   | client = new Redis(this.url!, {                                           |
| lib/cache/redisDashboardCache.ts                      | 47    | const client = new Redis(this.url, {                                      |
| lib/cache/redisWindowCounter.ts                       | 99    | client = new Redis(this.url!, {                                           |
| lib/middleware/redisRateLimit.ts                      | 69    | client = new Redis(process.env.REDIS_URL \|\| 'redis://localhost:6379', { |
| lib/middleware/redisRateLimit.ts                      | 132   | throw new Error('Respuesta inválida del limitador Redis');                |
| scripts/arquitectura/analisis.mjs                     | 403   | /\bnew (Redis\|RedisClient\|ioredis)\b/.test(linea) \|\|                  |
| scripts/redis-dev.js                                  | 6     | const client = new Redis(url, {                                           |
| app/tickets/page.tsx                                  | —     | caché en memoria (new Map + cache)                                        |
| app/tickets/page.tsx                                  | —     | caché compartida en globalThis                                            |
| app/transfers/page.tsx                                | —     | caché en memoria (new Map + cache)                                        |
| components/bar/CoversTab.tsx                          | —     | caché en memoria (new Map + cache)                                        |
| components/bar/EntregaCoversDialog.tsx                | —     | caché en memoria (new Map + cache)                                        |
| components/bar/SolicitudesCoversPanel.tsx             | —     | caché en memoria (new Map + cache)                                        |
| components/meals/ColacionesTab.tsx                    | —     | caché en memoria (new Map + cache)                                        |
| components/products/ExpiredStockPanel.tsx             | —     | caché en memoria (new Map + cache)                                        |
| components/settings/SettingsBottleHostessCard.tsx     | —     | caché en memoria (new Map + cache)                                        |
| components/shared/ProductPhoto.tsx                    | —     | caché en memoria (new Map + cache)                                        |
| hooks/shared/useConfigValue.ts                        | —     | caché compartida en globalThis                                            |
| lib/api/sseBus.ts                                     | —     | caché compartida en globalThis                                            |
| lib/auth/permissions-cache.ts                         | —     | caché en memoria (new Map + cache)                                        |
| lib/cache/failedLoginStore.ts                         | —     | caché en memoria (new Map + cache)                                        |
| lib/database/db.ts                                    | —     | caché compartida en globalThis                                            |
| lib/media/product-background.mjs                      | —     | caché compartida en globalThis                                            |
| mcp/src/http-app.ts                                   | —     | caché en memoria (new Map + cache)                                        |
| modules/asistencia/biometrico/netSdk.ts               | —     | caché compartida en globalThis                                            |
| modules/asistencia/biometrico/pruebaIdentificacion.ts | —     | caché en memoria (new Map + cache)                                        |
| modules/asistencia/biometrico/softwareFaceSdk.ts      | —     | caché compartida en globalThis                                            |
| modules/asistencia/biometrico/videoStream.ts          | —     | caché en memoria (new Map + cache)                                        |
| scripts/arquitectura/analisis.mjs                     | —     | caché compartida en globalThis                                            |

## 7. Contratos HTTP

Cada ruta con su nivel de acceso. Este inventario es el contrato que la
migración no puede romper.

| Ruta                                          | Métodos | Nivel                             | Driver | Audit |
| --------------------------------------------- | ------- | --------------------------------- | ------ | ----- |
| /api/products/stock-reconciliation            |         | products.read                     |        | audit |
| /api/accounts/:id/charge-with-sale            |         | finances.write                    |        | audit |
| /api/accounts/:id/charge                      |         | finances.write                    |        | audit |
| /api/accounts/:id                             |         | publico                           |        | audit |
| /api/accounts/:id/stop                        |         | finances.write                    |        | audit |
| /api/accounts/cancellation-request            | GET     | SIN_WRAPPER                       |        |       |
| /api/accounts/cancellation                    |         | finances.write                    |        | audit |
| /api/accounts/process-cancellation            | POST    | SIN_WRAPPER                       |        |       |
| /api/accounts                                 |         | publico                           |        | audit |
| /api/advances/:id                             |         | advances.process                  |        | audit |
| /api/advances/approve                         |         | administrator                     |        | audit |
| /api/advances/balances                        |         | advances.read                     |        | audit |
| /api/advances/by-dates                        |         | authenticated                     |        | audit |
| /api/advances/max                             |         | authenticated                     |        | audit |
| /api/advances/request-details                 |         | publico                           |        |       |
| /api/advances/requests                        |         | authenticated                     |        | audit |
| /api/advances                                 |         | advances.read                     |        | audit |
| /api/advances/user                            |         | authenticated                     |        | audit |
| /api/attendance/:id/detail                    |         | publico                           |        |       |
| /api/attendance/bulk                          |         | attendance.write                  |        | audit |
| /api/attendance/by-dates                      |         | authenticated                     |        | audit |
| /api/attendance/qr                            |         | attendance.write                  |        | audit |
| /api/attendance/ranking                       |         | attendance.read                   |        |       |
| /api/attendance/register                      |         | publico                           |        |       |
| /api/attendance                               |         | publico                           |        | audit |
| /api/attendance/stats                         |         | publico                           |        |       |
| /api/attendance/today                         |         | publico                           |        |       |
| /api/attendance/user                          |         | authenticated                     |        | audit |
| /api/audit-logs                               |         | publico                           |        |       |
| /api/auth/change-password                     |         | authenticated                     |        | audit |
| /api/auth/check-session                       |         | authenticated                     |        | audit |
| /api/auth/check-users                         |         | publico                           |        |       |
| /api/auth/check                               |         | authenticated                     |        | audit |
| /api/auth/login                               |         | SIN_WRAPPER                       |        |       |
| /api/auth/logout                              |         | publico                           |        |       |
| /api/auth/logs                                |         | administrator                     |        |       |
| /api/auth/me                                  |         | authenticated                     |        | audit |
| /api/auth/refresh                             |         | publico                           |        |       |
| /api/auth/register-first-user                 |         | publico                           |        |       |
| /api/auth/reset-password                      |         | publico                           |        |       |
| /api/bar/containers/confirm                   |         | products.confirm_container_return |        | audit |
| /api/bar/containers                           |         | products.read                     |        |       |
| /api/bar/containers/summary                   |         | products.read                     |        |       |
| /api/bar/movements                            |         | publico                           |        |       |
| /api/bar/reorder                              |         | products.write                    |        | audit |
| /api/bar                                      |         | publico                           |        | audit |
| /api/bar/shots                                |         | publico                           |        |       |
| /api/biometric/devices/:id/credentials        |         | administrator                     |        | audit |
| /api/biometric/devices/:id/discover           |         | administrator                     |        | audit |
| /api/biometric/devices/:id/poller             |         | administrator                     |        | audit |
| /api/biometric/devices/:id/resync             |         | administrator                     |        | audit |
| /api/biometric/devices/:id                    |         | administrator                     |        | audit |
| /api/biometric/devices/:id/snapshot           |         | administrator                     |        |       |
| /api/biometric/devices/:id/video              |         | administrator                     |        |       |
| /api/biometric/devices                        |         | administrator                     |        | audit |
| /api/biometric/reception                      |         | administrator                     |        | audit |
| /api/biometric/records/:id/photo              |         | authenticated                     |        |       |
| /api/biometric/records/poll                   |         | administrator                     |        | audit |
| /api/biometric/status                         |         | administrator                     |        |       |
| /api/biometrico/identificar                   |         | users.read                        |        |       |
| /api/calendar/data                            |         | publico                           |        |       |
| /api/calendar                                 |         | publico                           |        |       |
| /api/cash-register/bar-sales                  |         | finances.view_details             |        |       |
| /api/cash-register/champagne-sales            |         | finances.view_details             |        |       |
| /api/cash-register/hostess-drinks             |         | finances.view_details             |        |       |
| /api/cash-register/sales-by-product           |         | finances.view_details             |        |       |
| /api/cash-register/stats                      |         | finances.read                     |        |       |
| /api/cashregister/:id                         |         | publico                           |        | audit |
| /api/cashregister/:id/whatsapp                |         | administrator                     |        | audit |
| /api/cashregister/closing-pdf                 |         | publico                           |        |       |
| /api/cashregister/closing-request             |         | publico                           |        |       |
| /api/cashregister/closing/resend              |         | finances.write                    |        | audit |
| /api/cashregister/closing                     |         | finances.write                    |        | audit |
| /api/cashregister/pdf-report                  |         | publico                           |        |       |
| /api/cashregister/process-closing             |         | publico                           |        |       |
| /api/cashregister                             |         | finances.read                     |        | audit |
| /api/cashregister/status                      |         | publico                           |        |       |
| /api/cashregister/withdrawals                 |         | finances.read                     |        | audit |
| /api/categories/:id                           |         | categories.delete                 |        |       |
| /api/categories/reorder                       |         | categories.write                  |        | audit |
| /api/categories                               |         | publico                           |        | audit |
| /api/cleaning                                 |         | authenticated                     |        | audit |
| /api/clients/:id                              |         | publico                           |        | audit |
| /api/clients/history                          |         | publico                           |        |       |
| /api/clients/prepaid                          |         | clients.write                     |        | audit |
| /api/clients/return/approve                   |         | clients.write                     |        | audit |
| /api/clients/return/reminder                  |         | clients.write                     |        | audit |
| /api/clients/return/requests                  |         | clients.read                      |        |       |
| /api/clients/return                           |         | clients.write                     |        | audit |
| /api/clients                                  |         | publico                           |        | audit |
| /api/code/current                             |         | authenticated                     |        | audit |
| /api/commissions/:id/details                  |         | publico                           |        |       |
| /api/commissions/:id                          |         | commissions.write                 |        | audit |
| /api/commissions                              |         | publico                           |        | audit |
| /api/commissions/user                         |         | authenticated                     |        | audit |
| /api/configurations                           |         | settings.write                    |        | audit |
| /api/cron/check-timers                        |         | publico                           |        |       |
| /api/csp-violation                            | POST    | SIN_WRAPPER                       |        |       |
| /api/dashboard/composite                      |         | dashboard.read                    |        | audit |
| /api/error-logs                               |         | publico                           |        |       |
| /api/events/detail/:id                        |         | authenticated                     |        | audit |
| /api/events/stats                             |         | authenticated                     |        | audit |
| /api/events/user                              |         | authenticated                     |        | audit |
| /api/gratifications/:id                       |         | gratificaciones.delete            |        | audit |
| /api/gratifications/approve                   | PUT     | SIN_WRAPPER                       |        |       |
| /api/gratifications/me                        |         | authenticated                     |        | audit |
| /api/gratifications/request-details           | GET     | SIN_WRAPPER                       |        |       |
| /api/gratifications                           |         | gratificaciones.write             |        | audit |
| /api/health                                   |         | publico                           |        |       |
| /api/hostesses/:id/release                    |         | users.write                       |        | audit |
| /api/hostesses/:id/status                     |         | users.write                       |        | audit |
| /api/hostesses/available                      |         | publico                           |        |       |
| /api/hostesses                                |         | publico                           |        |       |
| /api/images/products/:id                      | GET     | SIN_WRAPPER                       |        |       |
| /api/images/users/:id                         | GET     | SIN_WRAPPER                       |        |       |
| /api/kiosk/attendance/challenge               | POST    | SIN_WRAPPER                       |        |       |
| /api/kiosk/board                              | GET     | SIN_WRAPPER                       |        |       |
| /api/kiosk/devices/:id                        |         | administrator                     |        | audit |
| /api/kiosk/devices                            |         | administrator                     |        |       |
| /api/kiosk/session                            |         | publico                           |        | audit |
| /api/mcp/admin/requests                       |         | administrator                     |        | audit |
| /api/mcp/admin/session                        |         | administrator                     |        |       |
| /api/meals                                    |         | products.read                     |        |       |
| /api/meals/rule                               |         | authenticated                     |        |       |
| /api/monitoring/slow-queries                  |         | administrator                     |        | audit |
| /api/notifications/assistance/accept          |         | authenticated                     |        | audit |
| /api/notifications/assistance                 |         | authenticated                     |        | audit |
| /api/notifications/kiosk                      | GET     | SIN_WRAPPER                       |        |       |
| /api/notifications/pending-count              |         | authenticated                     |        | audit |
| /api/notifications/pending                    |         | authenticated                     |        | audit |
| /api/notifications                            |         | authenticated                     |        | audit |
| /api/notifications/sse                        | GET     | SIN_WRAPPER                       |        |       |
| /api/orders/:id/baucher                       |         | orders.read                       |        |       |
| /api/orders/:id                               |         | orders.delete                     |        | audit |
| /api/orders/check-active-room                 |         | publico                           |        |       |
| /api/orders/detail                            |         | publico                           |        |       |
| /api/orders                                   |         | publico                           |        | audit |
| /api/orders/sse                               | GET     | SIN_WRAPPER                       |        |       |
| /api/orders/user                              |         | authenticated                     |        | audit |
| /api/overtime/by-dates                        |         | authenticated                     |        | audit |
| /api/overtime                                 |         | overtime.write                    |        | audit |
| /api/overtime/user                            |         | authenticated                     |        | audit |
| /api/payroll                                  |         | publico                           |        | audit |
| /api/permissions/:id                          |         | settings.write                    |        | audit |
| /api/permissions/invalidate-cache             |         | administrator                     |        | audit |
| /api/permissions                              |         | publico                           |        | audit |
| /api/permissions/setup-cashier                |         | administrator                     |        | audit |
| /api/ping                                     |         | publico                           |        |       |
| /api/products/:id                             |         | products.write                    |        | audit |
| /api/products/:id/tiers                       |         | publico                           |        | audit |
| /api/products/expired                         |         | products.read                     |        |       |
| /api/products/for-sale                        |         | publico                           |        |       |
| /api/products/presentations                   |         | products.read                     |        |       |
| /api/products/reorder                         |         | products.write                    |        | audit |
| /api/products                                 |         | publico                           |        | audit |
| /api/products/units/printed                   |         | products.write                    |        | audit |
| /api/products/units                           |         | products.read                     |        |       |
| /api/public/users                             | GET     | SIN_WRAPPER                       |        |       |
| /api/purchases/:id/codes                      |         | products.read                     |        |       |
| /api/purchases/catalog                        |         | products.read                     |        |       |
| /api/purchases/replenishment                  |         | products.read                     |        |       |
| /api/purchases                                |         | products.read                     |        |       |
| /api/quinchos/:id                             |         | quinchos.delete                   |        | audit |
| /api/quinchos                                 |         | quinchos.read                     |        |       |
| /api/reports/cash-register                    |         | publico                           |        |       |
| /api/reports/commissions                      |         | publico                           |        |       |
| /api/reports/sales                            |         | publico                           |        |       |
| /api/reviews                                  |         | publico                           |        |       |
| /api/roles/:id/permissions                    |         | publico                           |        | audit |
| /api/roles/:id                                |         | publico                           |        | audit |
| /api/roles/:id/users                          |         | publico                           |        |       |
| /api/roles/admin/permissions                  |         | publico                           |        |       |
| /api/roles                                    |         | publico                           |        | audit |
| /api/roles/setup                              |         | administrator                     |        | audit |
| /api/rooms/:id                                |         | publico                           |        | audit |
| /api/rooms/reorder                            |         | rooms.write                       |        | audit |
| /api/rooms                                    |         | publico                           |        | audit |
| /api/sales/:id/baucher                        |         | sales.read                        |        |       |
| /api/sales/:id                                |         | publico                           |        | audit |
| /api/sales/cancellation-request               | GET     | SIN_WRAPPER                       |        |       |
| /api/sales/cancellation                       |         | sales.anulate                     |        | audit |
| /api/sales/process-cancellation               | POST    | SIN_WRAPPER                       |        |       |
| /api/sales                                    |         | publico                           |        | audit |
| /api/sales/stats                              |         | publico                           |        |       |
| /api/service-requests/:id/approve             |         | orders.process                    |        | audit |
| /api/service-requests/:id/reject              |         | orders.process                    |        | audit |
| /api/service-requests/pending-count           |         | publico                           |        |       |
| /api/service-requests                         |         | publico                           |        | audit |
| /api/services/:id/hostesses                   |         | private_rooms.write               |        | audit |
| /api/services/:id                             |         | publico                           |        | audit |
| /api/services/by-dates                        |         | publico                           |        |       |
| /api/services/cancellation-request            | GET     | authenticated                     |        | audit |
| /api/services/cancellation                    |         | authenticated                     |        | audit |
| /api/services/process-cancellation            | POST    | SIN_WRAPPER                       |        |       |
| /api/services                                 |         | publico                           |        | audit |
| /api/services/temporary                       |         | authenticated                     |        | audit |
| /api/services/user                            |         | authenticated                     |        | audit |
| /api/settings/backup/:id/download             |         | settings.read                     |        | audit |
| /api/settings/backup/:id/restore              |         | settings.write                    |        | audit |
| /api/settings/backup                          |         | settings.write                    |        | audit |
| /api/settings/database-clean                  |         | publico                           |        |       |
| /api/settings/presence                        |         | settings.read                     |        | audit |
| /api/stats/dashboard-summary                  |         | dashboard.read                    |        | audit |
| /api/stats/logged-users                       |         | users.read                        |        |       |
| /api/stats/sales-by-month                     |         | sales.read                        |        |       |
| /api/stats/sales-by-week                      |         | sales.read                        |        |       |
| /api/sync-operations                          |         | authenticated                     |        |       |
| /api/test-auth                                |         | publico                           |        |       |
| /api/tickets/:id/anular                       |         | entradas.deliver                  |        | audit |
| /api/tickets/:id/baucher                      |         | entradas.view                     |        |       |
| /api/tickets/:id/entregar                     |         | entradas.deliver                  |        | audit |
| /api/tickets/cancellation-request             | GET     | SIN_WRAPPER                       |        |       |
| /api/tickets/cortesia-solicitudes/:id/approve |         | SIN_WRAPPER                       |        |       |
| /api/tickets/cortesia-solicitudes/:id/reject  |         | SIN_WRAPPER                       |        |       |
| /api/tickets/cortesia-solicitudes             |         | SIN_WRAPPER                       |        |       |
| /api/tickets/cover-solicitudes/:id/approve    |         | entradas.authorize_cover          |        | audit |
| /api/tickets/cover-solicitudes/:id/reject     |         | entradas.authorize_cover          |        | audit |
| /api/tickets/cover-solicitudes                |         | entradas.view                     |        |       |
| /api/tickets/entregar-grupo                   |         | entradas.deliver                  |        | audit |
| /api/tickets/pendientes                       |         | entradas.deliver                  |        |       |
| /api/tickets/process-cancellation             |         | entradas.deliver                  |        | audit |
| /api/tickets                                  |         | entradas.view                     |        |       |
| /api/timers/active                            |         | publico                           |        |       |
| /api/tips/:id                                 |         | publico                           |        |       |
| /api/tips                                     |         | tips.read                         |        | audit |
| /api/tips/user                                |         | authenticated                     |        | audit |
| /api/transfers/:id/accept                     |         | products.accept_transfer          |        | audit |
| /api/transfers/pending                        |         | products.read                     |        |       |
| /api/transfers                                |         | products.read                     |        |       |
| /api/users/:id/biometric/capture              |         | users.write                       |        | audit |
| /api/users/:id/biometric/captures             |         | users.write                       |        | audit |
| /api/users/:id/biometric/devices              |         | users.read                        |        |       |
| /api/users/:id/biometric                      |         | users.write                       |        | audit |
| /api/users/:id/biometric/sync                 |         | users.write                       |        | audit |
| /api/users/:id/biometric/verify               |         | users.write                       |        | audit |
| /api/users/:id/permissions                    |         | publico                           |        |       |
| /api/users/:id                                |         | users.write                       |        | audit |
| /api/users/me/stats                           |         | authenticated                     |        | audit |
| /api/users/profile                            |         | authenticated                     |        | audit |
| /api/users/recovery-email-reminder            |         | users.write                       |        | audit |
| /api/users                                    |         | users.write                       |        | audit |
| /api/users/status                             |         | authenticated                     |        | audit |
| /api/waiters                                  |         | publico                           |        |       |
| /api/whatsapp/administradores                 |         | administrator                     |        | audit |
| /api/whatsapp/status                          | POST    | SIN_WRAPPER                       |        |       |
| /api/whatsapp/test                            |         | settings.read                     |        |       |
| /api/whatsapp/webhook                         | POST    | SIN_WRAPPER                       |        |       |

## 8. Matriz de dependencias por capa

Importaciones entre capas técnicas. Las celdas vacías son las que el plan quiere
poder restringir.

| origen ↓ / destino →    | modules/aplicacion | modules/infraestructura | workflows | app/api | app/ui | components | hooks | lib/api | lib/business | lib/services | lib/repositories | lib/database | lib/identidad | lib/biometric | lib/integrations | lib/otros | scripts | raiz | tests |
| ----------------------- | ------------------ | ----------------------- | --------- | ------- | ------ | ---------- | ----- | ------- | ------------ | ------------ | ---------------- | ------------ | ------------- | ------------- | ---------------- | --------- | ------- | ---- | ----- |
| modules/aplicacion      |                    | 22                      |           |         |        |            |       | 11      | 47           |              |                  | 23           | 3             |               |                  | 108       |         | 8    |       |
| modules/infraestructura | 24                 |                         |           |         |        |            |       | 9       | 76           |              |                  | 127          | 2             |               |                  | 172       |         | 4    |       |
| workflows               | 4                  |                         |           |         |        |            |       | 4       | 11           |              |                  |              |               |               |                  | 25        |         |      |       |
| app/api                 | 1                  |                         | 27        |         |        |            |       | 306     | 40           |              |                  | 3            | 16            |               | 4                | 93        |         |      |       |
| app/ui                  | 3                  |                         |           |         |        | 6          | 64    | 7       | 6            |              |                  |              |               |               |                  | 57        |         | 14   |       |
| components              | 10                 |                         |           |         |        |            | 159   | 3       | 60           |              |                  |              |               |               |                  | 411       |         | 94   |       |
| hooks                   | 2                  |                         |           |         |        | 20         |       | 8       | 19           |              |                  |              |               |               |                  | 111       |         | 40   |       |
| lib/api                 | 1                  |                         |           |         |        |            |       |         | 2            |              |                  | 2            | 4             |               |                  | 8         |         |      |       |
| lib/business            | 6                  |                         |           |         |        | 1          |       | 3       |              |              |                  |              |               |               |                  | 15        |         | 4    |       |
| lib/database            |                    |                         |           |         |        |            |       |         | 1            |              |                  |              |               |               |                  | 4         |         |      |       |
| lib/identidad           |                    |                         |           |         |        |            |       |         |              |              |                  |              |               |               |                  | 5         |         |      |       |
| lib/integrations        |                    |                         |           |         |        |            |       |         |              |              |                  |              |               |               |                  |           |         |      |       |
| lib/otros               |                    |                         |           |         |        | 3          |       | 2       | 7            |              |                  | 3            |               |               |                  |           |         | 8    |       |
| scripts                 |                    |                         |           |         |        |            |       |         |              |              |                  |              |               |               |                  |           |         |      |       |
| raiz                    | 1                  |                         |           |         |        |            | 6     | 2       |              |              |                  |              | 2             |               |                  | 13        |         |      |       |
