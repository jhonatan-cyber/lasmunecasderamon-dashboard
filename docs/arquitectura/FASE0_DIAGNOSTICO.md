# Diagnóstico de arquitectura — Fase 0

Generado por `scripts/arquitectura/analisis.mjs`. No modificar a mano.

| Métrica                                    | Valor  |
| ------------------------------------------ | ------ |
| Archivos analizados                        | 2069   |
| Rutas HTTP                                 | 222    |
| **Rutas con SQL directo**                  | **0**  |
| **Archivos con SQL fuera de repositorios** | **60** |
| Tablas con más de un escritor              | 0      |
| Ciclos entre dominios                      | 0      |
| Procesos periódicos                        | 20     |
| Puntos de caché                            | 23     |
| Rutas sin `withRoute`                      | 20     |

## 1. SQL fuera de repositorios

Objetivo del plan (§3.3 y §5): el SQL queda en infraestructura, los
controladores HTTP traducen. Esto es lo que hay que reducir a cero.

| Capa               | Archivos con SQL |
| ------------------ | ---------------- |
| scripts            | 11               |
| raiz               | 5                |
| modules/aplicacion | 36               |
| lib/otros          | 3                |
| lib/identidad      | 1                |
| lib/business       | 4                |

<details><summary>Detalle por archivo</summary>

| Archivo                                                | Capa               | Tablas que escribe                                        |
| ------------------------------------------------------ | ------------------ | --------------------------------------------------------- |
| scripts/benchmark-indice-inventario.mjs                | scripts            | pg_temp                                                   |
| scripts/clean-sync-probes.js                           | scripts            | sync_operations                                           |
| scripts/compare-schema.mjs                             | scripts            | —                                                         |
| scripts/db_test.js                                     | scripts            | —                                                         |
| scripts/lib/twilio-config.js                           | scripts            | —                                                         |
| scripts/postgres-migrations.mjs                        | scripts            | _postgres_migrations                                      |
| scripts/purge-query-logs.js                            | scripts            | query_logs                                                |
| scripts/reconcile-migration-checksum.mjs               | scripts            | _postgres_migrations                                      |
| scripts/run-integration-all.js                         | scripts            | —                                                         |
| scripts/verify-migrations.mjs                          | scripts            | —                                                         |
| scripts/verify-schema-parity.mjs                       | scripts            | —                                                         |
| proxy.ts                                               | raiz               | —                                                         |
| seed/seed-asistencia.mjs                               | raiz               | asistencias                                               |
| seed/seed-categorias.mjs                               | raiz               | categorias                                                |
| seed/seed-clientes.mjs                                 | raiz               | clientes                                                  |
| seed/seed-productos.mjs                                | raiz               | inventario_presentaciones, inventario_unidades, productos |
| modules/asistencia/biometrico/avisosAudio.ts           | modules/aplicacion | —                                                         |
| modules/asistencia/biometrico/clockSync.ts             | modules/aplicacion | —                                                         |
| modules/asistencia/biometrico/deviceAuth.ts            | modules/aplicacion | biometric_devices                                         |
| modules/asistencia/biometrico/enrollmentService.ts     | modules/aplicacion | biometric_devices, biometric_plantillas                   |
| modules/asistencia/biometrico/eventListener.ts         | modules/aplicacion | biometric_device_records                                  |
| modules/asistencia/biometrico/identificacionFacial.ts  | modules/aplicacion | biometric_device_records, biometric_plantillas            |
| modules/asistencia/biometrico/ipDiscovery.ts           | modules/aplicacion | biometric_devices                                         |
| modules/asistencia/biometrico/ipWatcher.ts             | modules/aplicacion | —                                                         |
| modules/asistencia/biometrico/processBiometricEvent.ts | modules/aplicacion | biometric_events                                          |
| modules/asistencia/biometrico/recepcionConfig.ts       | modules/aplicacion | —                                                         |
| modules/asistencia/biometrico/recordPhotos.ts          | modules/aplicacion | biometric_device_records                                  |
| modules/asistencia/biometrico/recordPoller.ts          | modules/aplicacion | biometric_device_records                                  |
| modules/asistencia/biometrico/statusService.ts         | modules/aplicacion | —                                                         |
| modules/asistencia/biometrico/verificacionRemota.ts    | modules/aplicacion | —                                                         |
| modules/asistencia/biometrico/videoStream.ts           | modules/aplicacion | —                                                         |
| modules/asistencia/kioskos/attendanceChallenges.ts     | modules/aplicacion | asistencia_desafios                                       |
| modules/asistencia/kioskos/deviceAuth.ts               | modules/aplicacion | kiosk_devices                                             |
| modules/auditoria/alertas/servicio.ts                  | modules/aplicacion | —                                                         |
| modules/caja/retiros/servicio.ts                       | modules/aplicacion | cajas                                                     |
| modules/comunicaciones/notificaciones/servicio.ts      | modules/aplicacion | —                                                         |
| modules/comunicaciones/push/servicio.ts                | modules/aplicacion | push_tokens                                               |
| modules/identidad/autenticacion/codigos.ts             | modules/aplicacion | codigos                                                   |
| modules/inventario/bar/configuracion.ts                | modules/aplicacion | —                                                         |
| modules/inventario/bar/validarConfiguracionVenta.ts    | modules/aplicacion | —                                                         |
| modules/inventario/bar/validarPedido.ts                | modules/aplicacion | —                                                         |
| modules/inventario/compras/servicio.ts                 | modules/aplicacion | inventario_presentaciones                                 |
| modules/inventario/limpieza/servicio.ts                | modules/aplicacion | limpieza_articulos, limpieza_movimientos, limpieza_stock  |
| modules/inventario/productos/eliminarFotos.ts          | modules/aplicacion | —                                                         |
| modules/inventario/productos/servicio.ts               | modules/aplicacion | —                                                         |
| modules/inventario/reposicion/servicio.ts              | modules/aplicacion | ordenes_reposicion                                        |
| modules/inventario/tipos.ts                            | modules/aplicacion | —                                                         |
| modules/operacion/cuentas/alta.ts                      | modules/aplicacion | —                                                         |
| modules/operacion/servicios/creacion.ts                | modules/aplicacion | —                                                         |
| modules/reportes/informes/caja.ts                      | modules/aplicacion | —                                                         |
| modules/reportes/informes/comisiones.ts                | modules/aplicacion | —                                                         |
| modules/reportes/informes/ventas.ts                    | modules/aplicacion | —                                                         |
| lib/notifications/orderNotificationUtils.ts            | lib/otros          | —                                                         |
| lib/transaction/contract.ts                            | lib/otros          | —                                                         |
| lib/transaction/infrastructure.ts                      | lib/otros          | —                                                         |
| lib/middleware/auth.ts                                 | lib/identidad      | —                                                         |
| lib/business/containerAlerts.ts                        | lib/business       | —                                                         |
| lib/business/shotAlerts.ts                             | lib/business       | —                                                         |
| lib/business/twilioConfig.ts                           | lib/business       | —                                                         |
| lib/business/whatsappConfig.ts                         | lib/business       | —                                                         |

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
| modules/inventario/categorias/repositorio.ts         | modules/infraestructura |
| modules/inventario/compras/servicio.ts               | modules/aplicacion      |
| modules/inventario/envases/infraestructura.ts        | modules/infraestructura |
| modules/inventario/limpieza/servicio.ts              | modules/aplicacion      |
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
| workflows/anulaciones-venta.ts                       | workflows               |
| workflows/anulaciones-whatsapp.ts                    | workflows               |
| workflows/cobrar-cuenta.ts                           | workflows               |
| workflows/eliminar-usuario.ts                        | workflows               |
| workflows/prepago.ts                                 | workflows               |
| workflows/ventas.ts                                  | workflows               |

## 5. Procesos periódicos y ciclo de vida

Deben pasar a tener un ciclo de vida explícito al migrar Asistencia (fase 3).

| Archivo                                           | Línea | Código                                                            |
| ------------------------------------------------- | ----- | ----------------------------------------------------------------- |
| app/attendance-qr/page.tsx                        | 147   | const intervalo = setInterval(() => cargarTablero(true), 60_000); |
| app/attendance-qr/page.tsx                        | 154   | const intervalo = setInterval(() => {                             |
| app/tickets/page.tsx                              | 368   | const interval = window.setInterval(actualizarFechaHora, 60_000); |
| app/api/notifications/kiosk/route.ts              | 30    | const interval = setInterval(() => {                              |
| components/attendance/QrCodeDialog.tsx            | 80    | const intervalo = setInterval(() => {                             |
| components/cash-register/CajaFormDialog.tsx       | 46    | const timer = setInterval(() => {                                 |
| components/cleaning/CleaningInventory.tsx         | 100   | const interval = window.setInterval(refresh, 30000);              |
| components/clients/DevolucionSolicitudesModal.tsx | 55    | const id = setInterval(fetchSolicitudes, 15000);                  |
| components/meals/ColacionesTab.tsx                | 288   | const id = setInterval(() => setAhora(Date.now()), 15_000);       |
| components/products/ContainerReturnsPanel.tsx     | 169   | const intervalo = setInterval(fetchResumen, 60_000);              |
| components/settings/BiometricStatus.tsx           | 103   | const intervalo = setInterval(() => void load(), 30_000);         |
| components/settings/SettingsWhatsAppTab.tsx       | 61    | const timer = setInterval(() => {                                 |
| hooks/shared/useSSE.ts                            | 23    | const interval = setInterval(() => {                              |
| hooks/shared/useSharedSSE.ts                      | 25    | const interval = setInterval(() => {                              |
| hooks/timers/useTimerAudio.ts                     | 12    | const interval = setInterval(() => {                              |
| hooks/timers/useTimerSync.ts                      | 101   | const interval = window.setInterval(onVisible, 120_000);          |
| lib/api/sseService.ts                             | 87    | this.heartbeatInterval = setInterval(() => {                      |
| lib/store/timerStore.ts                           | 148   | tickInterval = setInterval(() => {                                |
| modules/asistencia/biometrico/ipWatcher.ts        | 119   | estado.timer = setInterval(arrancar, intervaloVigilanciaIp());    |
| modules/asistencia/biometrico/recordPoller.ts     | 362   | estado.timer = setInterval(() => {                                |

## 6. Cachés

| Archivo                                      | Línea | Tipo                                                                      |
| -------------------------------------------- | ----- | ------------------------------------------------------------------------- |
| lib/api/sseBus.ts                            | 112   | publisher = new Redis(process.env.REDIS_URL!, options);                   |
| lib/api/sseBus.ts                            | 113   | subscriber = new Redis(process.env.REDIS_URL!, options);                  |
| lib/auth/permissions-cache.ts                | 101   | client = new Redis(this.url, {                                            |
| lib/cache/failedLoginStore.ts                | 111   | client = new Redis(this.url!, {                                           |
| lib/cache/redisDashboardCache.ts             | 47    | const client = new Redis(this.url, {                                      |
| lib/cache/redisWindowCounter.ts              | 99    | client = new Redis(this.url!, {                                           |
| lib/middleware/redisRateLimit.ts             | 69    | client = new Redis(process.env.REDIS_URL \|\| 'redis://localhost:6379', { |
| lib/middleware/redisRateLimit.ts             | 132   | throw new Error('Respuesta inválida del limitador Redis');                |
| scripts/arquitectura/analisis.mjs            | 368   | /\bnew (Redis\|RedisClient\|ioredis)\b/.test(linea) \|\|                  |
| scripts/redis-dev.js                         | 6     | const client = new Redis(url, {                                           |
| app/tickets/page.tsx                         | —     | caché en memoria (new Map + cache)                                        |
| app/tickets/page.tsx                         | —     | caché compartida en globalThis                                            |
| components/shared/ProductPhoto.tsx           | —     | caché en memoria (new Map + cache)                                        |
| hooks/shared/useConfigValue.ts               | —     | caché compartida en globalThis                                            |
| lib/api/sseBus.ts                            | —     | caché compartida en globalThis                                            |
| lib/auth/permissions-cache.ts                | —     | caché en memoria (new Map + cache)                                        |
| lib/cache/failedLoginStore.ts                | —     | caché en memoria (new Map + cache)                                        |
| lib/database/db.ts                           | —     | caché compartida en globalThis                                            |
| lib/media/product-background.mjs             | —     | caché compartida en globalThis                                            |
| mcp/src/http-app.ts                          | —     | caché en memoria (new Map + cache)                                        |
| modules/asistencia/biometrico/netSdk.ts      | —     | caché compartida en globalThis                                            |
| modules/asistencia/biometrico/videoStream.ts | —     | caché en memoria (new Map + cache)                                        |
| scripts/arquitectura/analisis.mjs            | —     | caché compartida en globalThis                                            |

## 7. Contratos HTTP

Cada ruta con su nivel de acceso. Este inventario es el contrato que la
migración no puede romper.

| Ruta                                   | Métodos | Nivel                             | Driver | Audit |
| -------------------------------------- | ------- | --------------------------------- | ------ | ----- |
| /api/accounts/:id/charge-with-sale     |         | finances.write                    |        | audit |
| /api/accounts/:id/charge               |         | finances.write                    |        | audit |
| /api/accounts/:id                      |         | publico                           |        | audit |
| /api/accounts/:id/stop                 |         | finances.write                    |        | audit |
| /api/accounts/cancellation-request     | GET     | SIN_WRAPPER                       |        |       |
| /api/accounts/cancellation             |         | finances.write                    |        | audit |
| /api/accounts/process-cancellation     | POST    | SIN_WRAPPER                       |        |       |
| /api/accounts                          |         | publico                           |        | audit |
| /api/advances/:id                      |         | advances.process                  |        | audit |
| /api/advances/approve                  |         | administrator                     |        | audit |
| /api/advances/balances                 |         | advances.read                     |        | audit |
| /api/advances/by-dates                 |         | authenticated                     |        | audit |
| /api/advances/max                      |         | authenticated                     |        | audit |
| /api/advances/request-details          |         | publico                           |        |       |
| /api/advances/requests                 |         | authenticated                     |        | audit |
| /api/advances                          |         | advances.read                     |        | audit |
| /api/advances/user                     |         | authenticated                     |        | audit |
| /api/attendance/:id/detail             |         | publico                           |        |       |
| /api/attendance/bulk                   |         | attendance.write                  |        | audit |
| /api/attendance/today                  |         | publico                           |        |       |
| /api/biometric/records/:id/photo       |         | authenticated                     |        |       |
| /api/cash-register/bar-sales           |         | publico                           |        |       |
| /api/cash-register/champagne-sales     |         | publico                           |        |       |
| /api/cash-register/hostess-drinks      |         | publico                           |        |       |
| /api/cash-register/sales-by-product    |         | publico                           |        |       |
| /api/cash-register/stats               |         | publico                           |        |       |
| /api/cashregister/closing-pdf          |         | publico                           |        |       |
| /api/cashregister/closing-request      |         | publico                           |        |       |
| /api/cashregister/closing/resend       |         | finances.write                    |        | audit |
| /api/cashregister/closing              |         | finances.write                    |        | audit |
| /api/cashregister/pdf-report           |         | publico                           |        |       |
| /api/cashregister/process-closing      |         | publico                           |        |       |
| /api/cashregister/withdrawals          |         | finances.read                     |        | audit |
| /api/clients/prepaid                   |         | clients.write                     |        | audit |
| /api/clients/return/approve            |         | clients.write                     |        | audit |
| /api/clients/return/reminder           |         | clients.write                     |        | audit |
| /api/clients/return/requests           |         | clients.read                      |        |       |
| /api/clients/return                    |         | clients.write                     |        | audit |
| /api/code/current                      |         | authenticated                     |        | audit |
| /api/gratifications/:id                |         | gratificaciones.delete            |        | audit |
| /api/gratifications/approve            | PUT     | SIN_WRAPPER                       |        |       |
| /api/gratifications/me                 |         | authenticated                     |        | audit |
| /api/gratifications/request-details    | GET     | SIN_WRAPPER                       |        |       |
| /api/gratifications                    |         | gratificaciones.write             |        | audit |
| /api/hostesses/:id/status              |         | users.write                       |        | audit |
| /api/hostesses/available               |         | publico                           |        |       |
| /api/hostesses                         |         | publico                           |        |       |
| /api/mcp/admin/requests                |         | administrator                     |        | audit |
| /api/meals                             |         | products.read                     |        |       |
| /api/meals/rule                        |         | authenticated                     |        |       |
| /api/permissions/setup-cashier         |         | administrator                     |        | audit |
| /api/sales/cancellation-request        | GET     | SIN_WRAPPER                       |        |       |
| /api/sales/cancellation                |         | sales.anulate                     |        | audit |
| /api/sales/process-cancellation        | POST    | SIN_WRAPPER                       |        |       |
| /api/service-requests/:id/approve      |         | orders.process                    |        | audit |
| /api/service-requests/:id/reject       |         | orders.process                    |        | audit |
| /api/service-requests/pending-count    |         | publico                           |        |       |
| /api/service-requests                  |         | publico                           |        | audit |
| /api/services/:id/hostesses            |         | private_rooms.write               |        | audit |
| /api/services/:id                      |         | publico                           |        | audit |
| /api/services/by-dates                 |         | publico                           |        |       |
| /api/services/cancellation-request     | GET     | authenticated                     |        | audit |
| /api/services/cancellation             |         | authenticated                     |        | audit |
| /api/services/process-cancellation     | POST    | SIN_WRAPPER                       |        |       |
| /api/services                          |         | publico                           |        | audit |
| /api/services/temporary                |         | authenticated                     |        | audit |
| /api/services/user                     |         | authenticated                     |        | audit |
| /api/tickets                           |         | products.read                     |        |       |
| /api/users/:id/biometric/capture       |         | users.write                       |        | audit |
| /api/users/:id/biometric/verify        |         | users.write                       |        | audit |
| /api/waiters                           |         | publico                           |        |       |
| /api/attendance/by-dates               |         | authenticated                     |        | audit |
| /api/attendance/qr                     |         | attendance.write                  |        | audit |
| /api/attendance/ranking                |         | attendance.read                   |        |       |
| /api/attendance/register               |         | publico                           |        |       |
| /api/attendance                        |         | publico                           |        | audit |
| /api/attendance/stats                  |         | publico                           |        |       |
| /api/attendance/user                   |         | authenticated                     |        | audit |
| /api/audit-logs                        |         | publico                           |        |       |
| /api/auth/change-password              |         | authenticated                     |        | audit |
| /api/auth/check-session                |         | authenticated                     |        | audit |
| /api/auth/check-users                  |         | publico                           |        |       |
| /api/auth/check                        |         | authenticated                     |        | audit |
| /api/auth/login                        |         | SIN_WRAPPER                       |        |       |
| /api/auth/logout                       |         | publico                           |        |       |
| /api/auth/logs                         |         | administrator                     |        |       |
| /api/auth/me                           |         | authenticated                     |        | audit |
| /api/auth/refresh                      |         | publico                           |        |       |
| /api/auth/register-first-user          |         | publico                           |        |       |
| /api/auth/reset-password               |         | publico                           |        |       |
| /api/bar/containers/confirm            |         | products.confirm_container_return |        | audit |
| /api/bar/containers                    |         | products.read                     |        |       |
| /api/bar/containers/summary            |         | products.read                     |        |       |
| /api/bar/movements                     |         | publico                           |        |       |
| /api/bar                               |         | publico                           |        | audit |
| /api/bar/shots                         |         | publico                           |        |       |
| /api/biometric/devices/:id/credentials |         | administrator                     |        | audit |
| /api/biometric/devices/:id/discover    |         | administrator                     |        | audit |
| /api/biometric/devices/:id/poller      |         | administrator                     |        | audit |
| /api/biometric/devices/:id/resync      |         | administrator                     |        | audit |
| /api/biometric/devices/:id             |         | administrator                     |        | audit |
| /api/biometric/devices/:id/snapshot    |         | administrator                     |        |       |
| /api/biometric/devices/:id/video       |         | administrator                     |        |       |
| /api/biometric/devices                 |         | administrator                     |        | audit |
| /api/biometric/reception               |         | administrator                     |        | audit |
| /api/biometric/records/poll            |         | administrator                     |        | audit |
| /api/biometric/status                  |         | administrator                     |        |       |
| /api/calendar/data                     |         | publico                           |        |       |
| /api/calendar                          |         | publico                           |        |       |
| /api/cashregister/:id                  |         | publico                           |        | audit |
| /api/cashregister/:id/whatsapp         |         | administrator                     |        | audit |
| /api/cashregister                      |         | finances.read                     |        | audit |
| /api/cashregister/status               |         | publico                           |        |       |
| /api/categories/:id                    |         | categories.delete                 |        |       |
| /api/categories/reorder                |         | categories.write                  |        | audit |
| /api/categories                        |         | publico                           |        | audit |
| /api/cleaning                          |         | authenticated                     |        | audit |
| /api/clients/:id                       |         | publico                           |        | audit |
| /api/clients/history                   |         | publico                           |        |       |
| /api/clients                           |         | publico                           |        | audit |
| /api/commissions/:id/details           |         | publico                           |        |       |
| /api/commissions/:id                   |         | commissions.write                 |        | audit |
| /api/commissions                       |         | publico                           |        | audit |
| /api/commissions/user                  |         | authenticated                     |        | audit |
| /api/configurations                    |         | settings.write                    |        | audit |
| /api/cron/check-timers                 |         | publico                           |        |       |
| /api/csp-violation                     | POST    | SIN_WRAPPER                       |        |       |
| /api/dashboard/composite               |         | dashboard.read                    |        | audit |
| /api/error-logs                        |         | publico                           |        |       |
| /api/events/detail/:id                 |         | authenticated                     |        | audit |
| /api/events/stats                      |         | authenticated                     |        | audit |
| /api/events/user                       |         | authenticated                     |        | audit |
| /api/health                            |         | publico                           |        |       |
| /api/images/products/:id               | GET     | SIN_WRAPPER                       |        |       |
| /api/images/users/:id                  | GET     | SIN_WRAPPER                       |        |       |
| /api/kiosk/attendance/challenge        | POST    | SIN_WRAPPER                       |        |       |
| /api/kiosk/board                       | GET     | SIN_WRAPPER                       |        |       |
| /api/kiosk/devices/:id                 |         | administrator                     |        | audit |
| /api/kiosk/devices                     |         | administrator                     |        |       |
| /api/kiosk/session                     |         | publico                           |        | audit |
| /api/mcp/admin/session                 |         | administrator                     |        |       |
| /api/monitoring/slow-queries           |         | administrator                     |        | audit |
| /api/notifications/assistance/accept   |         | authenticated                     |        | audit |
| /api/notifications/assistance          |         | authenticated                     |        | audit |
| /api/notifications/kiosk               | GET     | SIN_WRAPPER                       |        |       |
| /api/notifications/pending-count       |         | authenticated                     |        | audit |
| /api/notifications/pending             |         | authenticated                     |        | audit |
| /api/notifications                     |         | authenticated                     |        | audit |
| /api/notifications/sse                 | GET     | SIN_WRAPPER                       |        |       |
| /api/orders/:id                        |         | orders.delete                     |        | audit |
| /api/orders/check-active-room          |         | publico                           |        |       |
| /api/orders/detail                     |         | publico                           |        |       |
| /api/orders                            |         | publico                           |        | audit |
| /api/orders/sse                        | GET     | SIN_WRAPPER                       |        |       |
| /api/orders/user                       |         | authenticated                     |        | audit |
| /api/overtime/by-dates                 |         | authenticated                     |        | audit |
| /api/overtime                          |         | overtime.write                    |        | audit |
| /api/overtime/user                     |         | authenticated                     |        | audit |
| /api/payroll                           |         | publico                           |        | audit |
| /api/permissions/:id                   |         | settings.write                    |        | audit |
| /api/permissions/invalidate-cache      |         | administrator                     |        | audit |
| /api/permissions                       |         | publico                           |        | audit |
| /api/ping                              |         | publico                           |        |       |
| /api/products/:id                      |         | products.write                    |        | audit |
| /api/products/:id/tiers                |         | publico                           |        | audit |
| /api/products/for-sale                 |         | publico                           |        |       |
| /api/products/presentations            |         | products.read                     |        |       |
| /api/products/reorder                  |         | products.write                    |        | audit |
| /api/products                          |         | publico                           |        | audit |
| /api/products/units/printed            |         | products.write                    |        | audit |
| /api/products/units                    |         | products.read                     |        |       |
| /api/public/users                      | GET     | SIN_WRAPPER                       |        |       |
| /api/purchases/catalog                 |         | products.read                     |        |       |
| /api/purchases/replenishment           |         | products.read                     |        |       |
| /api/purchases                         |         | products.read                     |        |       |
| /api/reports/cash-register             |         | publico                           |        |       |
| /api/reports/commissions               |         | publico                           |        |       |
| /api/reports/sales                     |         | publico                           |        |       |
| /api/reviews                           |         | publico                           |        |       |
| /api/roles/:id/permissions             |         | publico                           |        | audit |
| /api/roles/:id                         |         | publico                           |        | audit |
| /api/roles/:id/users                   |         | publico                           |        |       |
| /api/roles/admin/permissions           |         | publico                           |        |       |
| /api/roles                             |         | publico                           |        | audit |
| /api/roles/setup                       |         | administrator                     |        | audit |
| /api/rooms/:id                         |         | publico                           |        | audit |
| /api/rooms/reorder                     |         | rooms.write                       |        | audit |
| /api/rooms                             |         | publico                           |        | audit |
| /api/sales/:id                         |         | publico                           |        | audit |
| /api/sales                             |         | publico                           |        | audit |
| /api/sales/stats                       |         | publico                           |        |       |
| /api/settings/backup/:id/download      |         | settings.read                     |        | audit |
| /api/settings/backup/:id/restore       |         | settings.write                    |        | audit |
| /api/settings/backup                   |         | settings.write                    |        | audit |
| /api/settings/database-clean           |         | publico                           |        |       |
| /api/settings/presence                 |         | settings.read                     |        | audit |
| /api/stats/dashboard-summary           |         | dashboard.read                    |        | audit |
| /api/stats/logged-users                |         | publico                           |        |       |
| /api/stats/sales-by-month              |         | publico                           |        |       |
| /api/stats/sales-by-week               |         | publico                           |        |       |
| /api/swagger                           | GET     | SIN_WRAPPER                       |        |       |
| /api/sync-operations                   |         | authenticated                     |        |       |
| /api/test-auth                         |         | publico                           |        |       |
| /api/timers/active                     |         | publico                           |        |       |
| /api/tips/:id                          |         | publico                           |        |       |
| /api/tips                              |         | tips.read                         |        | audit |
| /api/tips/user                         |         | authenticated                     |        | audit |
| /api/transfers/:id/accept              |         | products.accept_transfer          |        | audit |
| /api/transfers/pending                 |         | products.read                     |        |       |
| /api/transfers                         |         | products.read                     |        |       |
| /api/users/:id/biometric/devices       |         | users.read                        |        |       |
| /api/users/:id/biometric               |         | users.write                       |        | audit |
| /api/users/:id/biometric/sync          |         | users.write                       |        | audit |
| /api/users/:id/permissions             |         | publico                           |        |       |
| /api/users/:id                         |         | users.write                       |        | audit |
| /api/users/me/stats                    |         | authenticated                     |        | audit |
| /api/users/profile                     |         | authenticated                     |        | audit |
| /api/users                             |         | users.write                       |        | audit |
| /api/users/status                      |         | authenticated                     |        | audit |
| /api/whatsapp/status                   | POST    | SIN_WRAPPER                       |        |       |
| /api/whatsapp/test                     |         | settings.read                     |        |       |
| /api/whatsapp/webhook                  | POST    | SIN_WRAPPER                       |        |       |

## 8. Matriz de dependencias por capa

Importaciones entre capas técnicas. Las celdas vacías son las que el plan quiere
poder restringir.

| origen ↓ / destino →    | modules/aplicacion | modules/infraestructura | workflows | app/api | app/ui | components | hooks | lib/api | lib/business | lib/services | lib/repositories | lib/database | lib/identidad | lib/biometric | lib/integrations | lib/otros | scripts | raiz | tests |
| ----------------------- | ------------------ | ----------------------- | --------- | ------- | ------ | ---------- | ----- | ------- | ------------ | ------------ | ---------------- | ------------ | ------------- | ------------- | ---------------- | --------- | ------- | ---- | ----- |
| modules/aplicacion      |                    | 23                      |           |         |        |            |       | 11      | 39           |              |                  | 44           | 3             |               |                  | 97        |         | 5    |       |
| modules/infraestructura | 25                 |                         |           |         |        |            |       | 9       | 62           |              |                  | 109          | 2             |               |                  | 156       |         | 2    |       |
| workflows               | 4                  |                         |           |         |        |            |       | 4       | 8            |              |                  |              |               |               |                  | 19        |         |      |       |
| app/api                 | 1                  |                         | 20        |         |        |            |       | 261     | 34           |              |                  | 3            | 17            |               | 4                | 74        |         |      |       |
| app/ui                  | 3                  |                         |           |         |        | 8          | 59    | 7       | 5            |              |                  |              |               |               |                  | 57        |         | 14   |       |
| components              | 6                  |                         |           |         | 1      |            | 142   | 3       | 37           |              |                  |              |               |               |                  | 331       |         | 86   |       |
| hooks                   | 2                  |                         |           |         |        | 17         |       | 7       | 11           |              |                  |              |               |               |                  | 96        |         | 38   |       |
| lib/api                 | 1                  |                         |           |         |        |            |       |         | 2            |              |                  | 2            | 3             |               |                  | 8         |         |      |       |
| lib/business            | 4                  |                         |           |         |        | 1          |       | 3       |              |              |                  | 4            |               |               |                  | 12        |         | 3    |       |
| lib/database            |                    |                         |           |         |        |            |       |         | 1            |              |                  |              |               |               |                  | 4         |         |      |       |
| lib/identidad           |                    |                         |           |         |        |            |       |         |              |              |                  |              |               |               |                  | 5         |         |      |       |
| lib/integrations        |                    |                         |           |         |        |            |       |         | 1            |              |                  |              |               |               |                  |           |         |      |       |
| lib/otros               |                    |                         |           |         |        | 2          |       | 1       | 6            |              |                  | 4            |               |               |                  |           |         | 6    |       |
| scripts                 |                    |                         |           |         |        |            |       |         |              |              |                  |              |               |               |                  |           |         |      |       |
| raiz                    | 1                  |                         |           |         |        |            | 4     | 2       |              |              |                  |              | 2             |               |                  | 13        |         |      |       |
