# Diagnóstico de arquitectura — Fase 0

Generado por `scripts/arquitectura/analisis.mjs`. No modificar a mano.

| Métrica                                    | Valor  |
| ------------------------------------------ | ------ |
| Archivos analizados                        | 1499   |
| Rutas HTTP                                 | 204    |
| **Rutas con SQL directo**                  | **36** |
| **Archivos con SQL fuera de repositorios** | **90** |
| Tablas con más de un escritor              | 13     |
| Ciclos entre dominios                      | 6      |
| Procesos periódicos                        | 15     |
| Puntos de caché                            | 19     |
| Rutas sin `withRoute`                      | 19     |

## 1. SQL fuera de repositorios

Objetivo del plan (§3.3 y §5): el SQL queda en infraestructura, los
controladores HTTP traducen. Esto es lo que hay que reducir a cero.

| Capa             | Archivos con SQL |
| ---------------- | ---------------- |
| scripts          | 11               |
| raiz             | 1                |
| lib/services     | 9                |
| lib/otros        | 4                |
| lib/integrations | 2                |
| lib/identidad    | 2                |
| lib/database     | 3                |
| lib/business     | 7                |
| lib/biometric    | 15               |
| app/api          | 36               |

<details><summary>Detalle por archivo</summary>

| Archivo                                              | Capa             | Tablas que escribe                                                                          |
| ---------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------- |
| scripts/clean-sync-probes.js                         | scripts          | sync_operations                                                                             |
| scripts/compare-schema.mjs                           | scripts          | —                                                                                           |
| scripts/db_test.js                                   | scripts          | —                                                                                           |
| scripts/lib/twilio-config.js                         | scripts          | —                                                                                           |
| scripts/postgres-migrations.mjs                      | scripts          | _postgres_migrations                                                                        |
| scripts/purge-query-logs.js                          | scripts          | query_logs                                                                                  |
| scripts/reconcile-migration-checksum.mjs             | scripts          | _postgres_migrations                                                                        |
| scripts/run-integration-all.js                       | scripts          | —                                                                                           |
| scripts/test-whatsapp.ts                             | scripts          | —                                                                                           |
| scripts/verify-migrations.mjs                        | scripts          | —                                                                                           |
| scripts/verify-schema-parity.mjs                     | scripts          | —                                                                                           |
| proxy.ts                                             | raiz             | —                                                                                           |
| lib/services/AccountService.ts                       | lib/services     | —                                                                                           |
| lib/services/AuditService.ts                         | lib/services     | —                                                                                           |
| lib/services/PermissionService.ts                    | lib/services     | —                                                                                           |
| lib/services/PurchaseService.ts                      | lib/services     | —                                                                                           |
| lib/services/RoomManager.ts                          | lib/services     | habitaciones, servicios, usuarios, ventas                                                   |
| lib/services/SaleService.ts                          | lib/services     | comisiones, detalle_comisiones, detalle_ventas, habitaciones, pedidos, ventas_usuarios      |
| lib/services/SecurityAlertService.ts                 | lib/services     | —                                                                                           |
| lib/services/ServiceService.ts                       | lib/services     | comisiones, detalle_comisiones, detalle_servicios, detalle_servicios_clientes, habitaciones |
| lib/services/WithdrawalService.ts                    | lib/services     | cajas                                                                                       |
| lib/kiosk/attendanceChallenges.ts                    | lib/otros        | asistencia_desafios                                                                         |
| lib/kiosk/deviceAuth.ts                              | lib/otros        | kiosk_devices                                                                               |
| lib/notifications/orderNotificationUtils.ts          | lib/otros        | —                                                                                           |
| lib/utils/logUtils.ts                                | lib/otros        | servicio_logs, venta_logs                                                                   |
| lib/integrations/pushNotifications.ts                | lib/integrations | usuarios                                                                                    |
| lib/integrations/whatsappPendingActions.ts           | lib/integrations | cuentas, detalle_cuentas, solicitudes_anulacion_cuentas, ventas                             |
| lib/auth/auth.ts                                     | lib/identidad    | logins                                                                                      |
| lib/middleware/auth.ts                               | lib/identidad    | —                                                                                           |
| lib/database/db.ts                                   | lib/database     | —                                                                                           |
| lib/database/maintenance.ts                          | lib/database     | backups                                                                                     |
| lib/database/perfilConsultas.ts                      | lib/database     | —                                                                                           |
| lib/business/anticiposUtils.ts                       | lib/business     | —                                                                                           |
| lib/business/codigoService.ts                        | lib/business     | codigos                                                                                     |
| lib/business/containerAlerts.ts                      | lib/business     | —                                                                                           |
| lib/business/pagosMixtos.ts                          | lib/business     | clientes, clientes_prepago_movimientos, cuentas                                             |
| lib/business/shotAlerts.ts                           | lib/business     | —                                                                                           |
| lib/business/twilioConfig.ts                         | lib/business     | —                                                                                           |
| lib/business/whatsappConfig.ts                       | lib/business     | —                                                                                           |
| lib/biometric/avisosAudio.ts                         | lib/biometric    | —                                                                                           |
| lib/biometric/clockSync.ts                           | lib/biometric    | —                                                                                           |
| lib/biometric/deviceAuth.ts                          | lib/biometric    | biometric_devices                                                                           |
| lib/biometric/enrollmentService.ts                   | lib/biometric    | biometric_devices, biometric_plantillas, usuarios                                           |
| lib/biometric/eventListener.ts                       | lib/biometric    | —                                                                                           |
| lib/biometric/identificacionFacial.ts                | lib/biometric    | biometric_device_records, biometric_plantillas                                              |
| lib/biometric/ipDiscovery.ts                         | lib/biometric    | biometric_devices                                                                           |
| lib/biometric/ipWatcher.ts                           | lib/biometric    | —                                                                                           |
| lib/biometric/processBiometricEvent.ts               | lib/biometric    | —                                                                                           |
| lib/biometric/recordPhotos.ts                        | lib/biometric    | biometric_device_records                                                                    |
| lib/biometric/recordPoller.ts                        | lib/biometric    | —                                                                                           |
| lib/biometric/statusService.ts                       | lib/biometric    | —                                                                                           |
| lib/biometric/unenrollmentService.ts                 | lib/biometric    | biometric_plantillas, usuarios                                                              |
| lib/biometric/verificacionRemota.ts                  | lib/biometric    | —                                                                                           |
| lib/biometric/videoStream.ts                         | lib/biometric    | —                                                                                           |
| app/api/anticipos/maximo/route.ts                    | app/api          | —                                                                                           |
| app/api/anticipos/solicitud-detalles/route.ts        | app/api          | —                                                                                           |
| app/api/anticipos/solicitudes/route.ts               | app/api          | —                                                                                           |
| app/api/attendance/qr/route.ts                       | app/api          | —                                                                                           |
| app/api/auth/change-password/route.ts                | app/api          | usuarios                                                                                    |
| app/api/biometric/devices/[id]/poller/route.ts       | app/api          | biometric_devices                                                                           |
| app/api/biometric/records/[id]/foto/route.ts         | app/api          | —                                                                                           |
| app/api/clients/devolucion/aprobar/route.ts          | app/api          | solicitudes_devolucion_saldo                                                                |
| app/api/clients/devolucion/recordatorio/route.ts     | app/api          | solicitudes_devolucion_saldo                                                                |
| app/api/clients/devolucion/solicitudes/route.ts      | app/api          | —                                                                                           |
| app/api/configurations/route.ts                      | app/api          | configuraciones                                                                             |
| app/api/cron/check-timers/route.ts                   | app/api          | cuentas, habitaciones, servicios, ventas                                                    |
| app/api/cuentas/anulacion/route.ts                   | app/api          | —                                                                                           |
| app/api/cuentas/procesar-anulacion/route.ts          | app/api          | —                                                                                           |
| app/api/cuentas/solicitud-anulacion/route.ts         | app/api          | —                                                                                           |
| app/api/health/route.ts                              | app/api          | —                                                                                           |
| app/api/kiosk/attendance/challenge/route.ts          | app/api          | —                                                                                           |
| app/api/kiosk/board/route.ts                         | app/api          | —                                                                                           |
| app/api/orders/check-active-room/route.ts            | app/api          | —                                                                                           |
| app/api/permissions/setup-cajero/route.ts            | app/api          | permissions, role_permissions                                                               |
| app/api/public/users/route.ts                        | app/api          | —                                                                                           |
| app/api/roles/[id]/permissions/route.ts              | app/api          | role_permissions                                                                            |
| app/api/roles/setup/route.ts                         | app/api          | —                                                                                           |
| app/api/servicios/anulacion/route.ts                 | app/api          | —                                                                                           |
| app/api/servicios/procesar-anulacion/route.ts        | app/api          | —                                                                                           |
| app/api/servicios/solicitud-anulacion/route.ts       | app/api          | solicitudes_anulacion_servicios                                                             |
| app/api/settings/backup/[id]/download/route.ts       | app/api          | —                                                                                           |
| app/api/settings/backup/[id]/restore/route.ts        | app/api          | —                                                                                           |
| app/api/settings/backup/route.ts                     | app/api          | backups                                                                                     |
| app/api/solicitudes-servicios/pending-count/route.ts | app/api          | —                                                                                           |
| app/api/users/[id]/permissions/route.ts              | app/api          | —                                                                                           |
| app/api/users/me/stats/route.ts                      | app/api          | —                                                                                           |
| app/api/ventas/anulacion/route.ts                    | app/api          | —                                                                                           |
| app/api/ventas/procesar-anulacion/route.ts           | app/api          | —                                                                                           |
| app/api/ventas/solicitud-anulacion/route.ts          | app/api          | —                                                                                           |
| app/api/whatsapp/webhook/route.ts                    | app/api          | —                                                                                           |

</details>

## 2. Propiedad de tablas

Tablas que escriben más de un repositorio. Son las escrituras cruzadas que el
principio 1 del plan quiere eliminar: cada tabla debería tener un único módulo
propietario.

| Tabla                        | Escritores | Repositorios                                                                                                                                                                            |
| ---------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| asistencias                  | 2          | lib/repositories/PayrollRepository.ts<br>lib/repositories/auth/AuthQueries.ts                                                                                                           |
| cajas                        | 2          | lib/repositories/CashRegisterRepository.ts<br>lib/repositories/service/ServiceQueries.ts                                                                                                |
| clientes                     | 4          | lib/repositories/ClientRepository.ts<br>lib/repositories/cuenta/CuentaQueries.ts<br>lib/repositories/sale/SaleQueries.ts<br>lib/repositories/service/ServiceQueries.ts                  |
| clientes_prepago_movimientos | 2          | lib/repositories/sale/SaleQueries.ts<br>lib/repositories/service/ServiceQueries.ts                                                                                                      |
| comisiones                   | 2          | lib/repositories/sale/SaleQueries.ts<br>lib/repositories/service/ServiceQueries.ts                                                                                                      |
| cuentas                      | 2          | lib/repositories/ClientRepository.ts<br>lib/repositories/cuenta/CuentaQueries.ts                                                                                                        |
| detalle_comisiones           | 2          | lib/repositories/PayrollRepository.ts<br>lib/repositories/sale/SaleQueries.ts                                                                                                           |
| detalle_propinas             | 3          | lib/repositories/PayrollRepository.ts<br>lib/repositories/TipRepository.ts<br>lib/repositories/sale/SaleQueries.ts                                                                      |
| habitaciones                 | 2          | lib/repositories/TimerRepository.ts<br>lib/repositories/cuenta/CuentaQueries.ts                                                                                                         |
| inventario_unidades          | 4          | lib/repositories/inventory/BarQueries.ts<br>lib/repositories/inventory/EnvaseQueries.ts<br>lib/repositories/inventory/TransferQueries.ts<br>lib/repositories/inventory/UnidadQueries.ts |
| logins                       | 2          | lib/repositories/CashRegisterRepository.ts<br>lib/repositories/auth/AuthQueries.ts                                                                                                      |
| servicios                    | 2          | lib/repositories/TimerRepository.ts<br>lib/repositories/service/ServiceQueries.ts                                                                                                       |
| ventas                       | 2          | lib/repositories/TimerRepository.ts<br>lib/repositories/sale/SaleQueries.ts                                                                                                             |

## 3. Ciclos entre dominios

| Ciclo                                                         |
| ------------------------------------------------------------- |
| asistencia → identidad → asistencia                           |
| identidad → personal → identidad                              |
| identidad → personal → comunicaciones → identidad             |
| comunicaciones → ventas → comunicaciones                      |
| comunicaciones → operacion → comunicaciones                   |
| identidad → personal → comunicaciones → operacion → identidad |

## 4. Transacciones

| Archivo con withTransaction                            | Capa             |
| ------------------------------------------------------ | ---------------- |
| app/api/cron/check-timers/route.ts                     | app/api          |
| app/api/roles/[id]/permissions/route.ts                | app/api          |
| lib/biometric/enrollmentService.ts                     | lib/biometric    |
| lib/biometric/unenrollmentService.ts                   | lib/biometric    |
| lib/database/maintenance.ts                            | lib/database     |
| lib/kiosk/deviceAuth.ts                                | lib/otros        |
| lib/repositories/CashRegisterRepository.ts             | lib/repositories |
| lib/repositories/CategoryRepository.ts                 | lib/repositories |
| lib/repositories/ClientRepository.ts                   | lib/repositories |
| lib/repositories/OrderRepository.ts                    | lib/repositories |
| lib/repositories/PayrollRepository.ts                  | lib/repositories |
| lib/repositories/ProductRepository.ts                  | lib/repositories |
| lib/repositories/PurchaseRepository.ts                 | lib/repositories |
| lib/repositories/RoleRepository.ts                     | lib/repositories |
| lib/repositories/TipRepository.ts                      | lib/repositories |
| lib/repositories/anticipo/AnticipoQueries.ts           | lib/repositories |
| lib/repositories/attendance/AttendanceQueries.ts       | lib/repositories |
| lib/repositories/cuenta/CuentaQueries.ts               | lib/repositories |
| lib/repositories/gratificacion/GratificacionQueries.ts | lib/repositories |
| lib/repositories/inventory/BarQueries.ts               | lib/repositories |
| lib/repositories/inventory/EnvaseQueries.ts            | lib/repositories |
| lib/repositories/inventory/PresentacionQueries.ts      | lib/repositories |
| lib/repositories/inventory/TransferQueries.ts          | lib/repositories |
| lib/repositories/inventory/UnidadQueries.ts            | lib/repositories |
| lib/repositories/sale/SaleQueries.ts                   | lib/repositories |
| lib/repositories/service/ServiceQueries.ts             | lib/repositories |
| lib/services/AccountService.ts                         | lib/services     |
| lib/services/PurchaseService.ts                        | lib/services     |
| lib/services/SaleService.ts                            | lib/services     |
| lib/services/ServiceService.ts                         | lib/services     |
| lib/services/WithdrawalService.ts                      | lib/services     |

## 5. Procesos periódicos y ciclo de vida

Deben pasar a tener un ciclo de vida explícito al migrar Asistencia (fase 3).

| Archivo                                           | Línea | Código                                                            |
| ------------------------------------------------- | ----- | ----------------------------------------------------------------- |
| app/api/notifications/kiosk/route.ts              | 30    | const interval = setInterval(() => {                              |
| app/asistencia-qr/page.tsx                        | 143   | const intervalo = setInterval(() => cargarTablero(true), 60_000); |
| app/asistencia-qr/page.tsx                        | 150   | const intervalo = setInterval(() => {                             |
| components/attendance/QrCodeDialog.tsx            | 80    | const intervalo = setInterval(() => {                             |
| components/caja/CajaFormDialog.tsx                | 46    | const timer = setInterval(() => {                                 |
| components/clients/DevolucionSolicitudesModal.tsx | 55    | const id = setInterval(fetchSolicitudes, 15000);                  |
| components/products/ContainerReturnsPanel.tsx     | 99    | const intervalo = setInterval(fetchResumen, 60_000);              |
| components/settings/BiometricStatus.tsx           | 98    | const intervalo = setInterval(() => void load(), 30_000);         |
| hooks/shared/useSSE.ts                            | 27    | const interval = setInterval(() => {                              |
| hooks/shared/useSharedSSE.ts                      | 28    | const interval = setInterval(() => {                              |
| hooks/timer/useTimerAudio.ts                      | 12    | const interval = setInterval(() => {                              |
| lib/api/sseService.ts                             | 87    | this.heartbeatInterval = setInterval(() => {                      |
| lib/biometric/ipWatcher.ts                        | 102   | timer = setInterval(arrancar, intervaloVigilanciaIp());           |
| lib/biometric/recordPoller.ts                     | 357   | estado.timer = setInterval(() => {                                |
| lib/store/timerStore.ts                           | 164   | tickInterval = setInterval(() => {                                |

## 6. Cachés

| Archivo                            | Línea | Tipo                                                                      |
| ---------------------------------- | ----- | ------------------------------------------------------------------------- |
| scripts/arquitectura/analisis.mjs  | 317   | /\bnew (Redis\|RedisClient\|ioredis)\b/.test(linea) \|\|                  |
| lib/api/sseBus.ts                  | 112   | publisher = new Redis(process.env.REDIS_URL!, options);                   |
| lib/api/sseBus.ts                  | 113   | subscriber = new Redis(process.env.REDIS_URL!, options);                  |
| lib/auth/failed-login-store.ts     | 111   | client = new Redis(this.url!, {                                           |
| lib/auth/permissions-cache.ts      | 101   | client = new Redis(this.url, {                                            |
| lib/cache/redisDashboardCache.ts   | 47    | const client = new Redis(this.url, {                                      |
| lib/cache/redisWindowCounter.ts    | 99    | client = new Redis(this.url!, {                                           |
| lib/middleware/redisRateLimit.ts   | 69    | client = new Redis(process.env.REDIS_URL \|\| 'redis://localhost:6379', { |
| lib/middleware/redisRateLimit.ts   | 132   | throw new Error('Respuesta inválida del limitador Redis');                |
| scripts/redis-dev.js               | 6     | const client = new Redis(url, {                                           |
| scripts/arquitectura/analisis.mjs  | —     | caché compartida en globalThis                                            |
| components/shared/ProductPhoto.tsx | —     | caché en memoria (new Map + cache)                                        |
| hooks/shared/useConfigValue.ts     | —     | caché compartida en globalThis                                            |
| lib/api/sseBus.ts                  | —     | caché compartida en globalThis                                            |
| lib/auth/failed-login-store.ts     | —     | caché en memoria (new Map + cache)                                        |
| lib/auth/permissions-cache.ts      | —     | caché en memoria (new Map + cache)                                        |
| lib/biometric/netSdk.ts            | —     | caché compartida en globalThis                                            |
| lib/biometric/videoStream.ts       | —     | caché en memoria (new Map + cache)                                        |
| lib/database/db.ts                 | —     | caché compartida en globalThis                                            |

## 7. Contratos HTTP

Cada ruta con su nivel de acceso. Este inventario es el contrato que la
migración no puede romper.

| Ruta                                     | Métodos  | Nivel                             | Driver | Audit |
| ---------------------------------------- | -------- | --------------------------------- | ------ | ----- |
| /api/anfitrionas/:id/status              |          | users.write                       |        | audit |
| /api/anfitrionas/disponibles             |          | publico                           |        |       |
| /api/anfitrionas                         |          | publico                           |        |       |
| /api/anticipos/:id                       |          | advances.process                  |        | audit |
| /api/anticipos/aprobar                   |          | advances.process                  |        | audit |
| /api/anticipos/balances                  |          | advances.read                     |        | audit |
| /api/anticipos/by-dates                  |          | authenticated                     |        | audit |
| /api/anticipos/maximo                    |          | authenticated                     | ⚠️ SQL | audit |
| /api/anticipos                           |          | advances.read                     |        | audit |
| /api/anticipos/solicitud-detalles        |          | publico                           | ⚠️ SQL |       |
| /api/anticipos/solicitudes               |          | advances.read                     | ⚠️ SQL | audit |
| /api/anticipos/user                      |          | authenticated                     |        | audit |
| /api/attendance/:id/detalle              |          | publico                           |        |       |
| /api/attendance/by-dates                 |          | authenticated                     |        | audit |
| /api/attendance/hoy                      |          | publico                           |        |       |
| /api/attendance/masivo                   |          | attendance.write                  |        | audit |
| /api/attendance/qr                       |          | attendance.write                  | ⚠️ SQL | audit |
| /api/attendance/register                 |          | publico                           |        |       |
| /api/attendance                          |          | publico                           |        | audit |
| /api/attendance/stats                    |          | publico                           |        |       |
| /api/attendance/user                     |          | authenticated                     |        | audit |
| /api/audit-logs                          |          | publico                           |        |       |
| /api/auth/change-password                |          | authenticated                     | ⚠️ SQL | audit |
| /api/auth/check-session                  |          | authenticated                     |        | audit |
| /api/auth/check-users                    |          | publico                           |        |       |
| /api/auth/check                          |          | authenticated                     |        | audit |
| /api/auth/login                          |          | SIN_WRAPPER                       |        |       |
| /api/auth/logout                         |          | publico                           |        |       |
| /api/auth/logs                           |          | administrator                     |        |       |
| /api/auth/me                             |          | authenticated                     |        | audit |
| /api/auth/refresh                        |          | publico                           |        |       |
| /api/auth/register-first-user            |          | publico                           |        |       |
| /api/auth/reset-password                 |          | publico                           |        |       |
| /api/bar/containers/confirm              |          | products.confirm_container_return |        | audit |
| /api/bar/containers                      |          | products.read                     |        |       |
| /api/bar/containers/summary              |          | products.read                     |        |       |
| /api/bar/movements                       |          | publico                           |        |       |
| /api/bar                                 |          | publico                           |        | audit |
| /api/bar/shots                           |          | publico                           |        |       |
| /api/biometric/devices/:id/credentials   |          | administrator                     |        | audit |
| /api/biometric/devices/:id/discover      |          | administrator                     |        | audit |
| /api/biometric/devices/:id/poller        |          | administrator                     | ⚠️ SQL | audit |
| /api/biometric/devices/:id/resync        |          | administrator                     |        | audit |
| /api/biometric/devices/:id               |          | administrator                     |        | audit |
| /api/biometric/devices/:id/snapshot      |          | administrator                     |        |       |
| /api/biometric/devices/:id/video         |          | administrator                     |        |       |
| /api/biometric/devices                   |          | administrator                     |        | audit |
| /api/biometric/records/:id/foto          |          | authenticated                     | ⚠️ SQL |       |
| /api/biometric/records/poll              |          | administrator                     |        | audit |
| /api/biometric/status                    |          | administrator                     |        |       |
| /api/caja/stats                          |          | publico                           |        |       |
| /api/caja/ventas-barras                  |          | publico                           |        |       |
| /api/caja/ventas-champagne               |          | publico                           |        |       |
| /api/caja/ventas-por-producto            |          | publico                           |        |       |
| /api/caja/ventas-tragos-chicas           |          | publico                           |        |       |
| /api/calendar/data                       |          | publico                           |        |       |
| /api/calendar                            |          | publico                           |        |       |
| /api/cashregister/:id                    |          | publico                           |        | audit |
| /api/cashregister/cierre/reenviar        |          | finances.write                    |        | audit |
| /api/cashregister/cierre                 |          | finances.write                    |        | audit |
| /api/cashregister/procesar-cierre        |          | publico                           |        |       |
| /api/cashregister/retiros                |          | finances.read                     |        | audit |
| /api/cashregister                        |          | finances.read                     |        | audit |
| /api/cashregister/solicitud-cierre       |          | publico                           |        |       |
| /api/cashregister/status                 |          | publico                           |        |       |
| /api/categories/:id                      |          | categories.write                  |        | audit |
| /api/categories/reorder                  |          | categories.write                  |        | audit |
| /api/categories                          |          | publico                           |        | audit |
| /api/clients/:id                         |          | publico                           |        | audit |
| /api/clients/devolucion/aprobar          |          | clients.write                     | ⚠️ SQL | audit |
| /api/clients/devolucion/recordatorio     |          | clients.write                     | ⚠️ SQL | audit |
| /api/clients/devolucion                  |          | clients.write                     |        | audit |
| /api/clients/devolucion/solicitudes      |          | clients.read                      | ⚠️ SQL |       |
| /api/clients/history                     |          | publico                           |        |       |
| /api/clients/prepago                     |          | clients.write                     |        | audit |
| /api/clients                             |          | publico                           |        | audit |
| /api/codigo/actual                       |          | authenticated                     |        | audit |
| /api/commissions/:id/details             |          | publico                           |        |       |
| /api/commissions/:id                     |          | commissions.write                 |        | audit |
| /api/commissions                         |          | publico                           |        | audit |
| /api/commissions/user                    |          | authenticated                     |        | audit |
| /api/configurations                      |          | settings.write                    | ⚠️ SQL | audit |
| /api/cron/check-timers                   |          | publico                           | ⚠️ SQL |       |
| /api/csp-violation                       | POST     | SIN_WRAPPER                       |        |       |
| /api/cuentas/:id/cobrar-con-venta        |          | finances.write                    |        | audit |
| /api/cuentas/:id/cobrar                  |          | finances.write                    |        | audit |
| /api/cuentas/:id                         |          | publico                           |        | audit |
| /api/cuentas/:id/stop                    |          | finances.write                    |        | audit |
| /api/cuentas/anulacion                   |          | finances.write                    | ⚠️ SQL | audit |
| /api/cuentas/procesar-anulacion          | POST     | SIN_WRAPPER                       | ⚠️ SQL |       |
| /api/cuentas                             |          | publico                           |        | audit |
| /api/cuentas/solicitud-anulacion         | GET      | SIN_WRAPPER                       | ⚠️ SQL |       |
| /api/dashboard/composite                 |          | dashboard.read                    |        | audit |
| /api/error-logs                          |          | publico                           |        |       |
| /api/events/detail/:id                   |          | authenticated                     |        | audit |
| /api/events/stats                        |          | authenticated                     |        | audit |
| /api/events/user                         |          | authenticated                     |        | audit |
| /api/garzones                            |          | publico                           |        |       |
| /api/gratificaciones/:id                 |          | gratificaciones.delete            |        | audit |
| /api/gratificaciones/aprobar             | PUT      | SIN_WRAPPER                       |        |       |
| /api/gratificaciones/me                  |          | authenticated                     |        | audit |
| /api/gratificaciones                     |          | gratificaciones.write             |        | audit |
| /api/gratificaciones/solicitud-detalles  | GET      | SIN_WRAPPER                       |        |       |
| /api/health                              |          | publico                           | ⚠️ SQL |       |
| /api/images/products/:id                 | GET      | SIN_WRAPPER                       |        |       |
| /api/kiosk/attendance/challenge          | POST     | SIN_WRAPPER                       | ⚠️ SQL |       |
| /api/kiosk/board                         | GET      | SIN_WRAPPER                       | ⚠️ SQL |       |
| /api/kiosk/devices/:id                   |          | administrator                     |        | audit |
| /api/kiosk/devices                       |          | administrator                     |        |       |
| /api/kiosk/session                       |          | publico                           |        | audit |
| /api/monitoring/slow-queries             |          | administrator                     |        | audit |
| /api/notifications/assistance/accept     |          | authenticated                     |        | audit |
| /api/notifications/assistance            |          | authenticated                     |        | audit |
| /api/notifications/kiosk                 | GET      | SIN_WRAPPER                       |        |       |
| /api/notifications/pending-count         |          | authenticated                     |        | audit |
| /api/notifications/pending               |          | authenticated                     |        | audit |
| /api/notifications                       |          | authenticated                     |        | audit |
| /api/notifications/sse                   | GET      | SIN_WRAPPER                       |        |       |
| /api/orders/:id                          |          | orders.delete                     |        | audit |
| /api/orders/check-active-room            |          | publico                           | ⚠️ SQL |       |
| /api/orders/detail                       |          | publico                           |        |       |
| /api/orders                              |          | publico                           |        | audit |
| /api/orders/sse                          | GET      | SIN_WRAPPER                       |        |       |
| /api/orders/user                         |          | authenticated                     |        | audit |
| /api/overtime/by-dates                   |          | authenticated                     |        | audit |
| /api/overtime                            |          | overtime.write                    |        | audit |
| /api/overtime/user                       |          | authenticated                     |        | audit |
| /api/payroll                             |          | publico                           |        | audit |
| /api/permissions/:id                     |          | settings.write                    |        | audit |
| /api/permissions/invalidate-cache        |          | administrator                     |        | audit |
| /api/permissions                         |          | publico                           |        | audit |
| /api/permissions/setup-cajero            |          | administrator                     | ⚠️ SQL | audit |
| /api/ping                                |          | publico                           |        |       |
| /api/products/:id                        |          | products.write                    |        | audit |
| /api/products/:id/tiers                  |          | publico                           |        | audit |
| /api/products/for-sale                   |          | publico                           |        |       |
| /api/products/presentations              |          | publico                           |        | audit |
| /api/products/reorder                    |          | products.write                    |        | audit |
| /api/products                            |          | publico                           |        | audit |
| /api/products/units/printed              |          | products.write                    |        | audit |
| /api/products/units                      |          | publico                           |        | audit |
| /api/public/users                        | GET      | SIN_WRAPPER                       | ⚠️ SQL |       |
| /api/purchases                           |          | products.read                     |        |       |
| /api/reports/cash-register               |          | publico                           |        |       |
| /api/reports/commissions                 |          | publico                           |        |       |
| /api/reports/sales                       |          | publico                           |        |       |
| /api/reviews                             |          | publico                           |        |       |
| /api/roles/:id/permissions               |          | publico                           | ⚠️ SQL | audit |
| /api/roles/:id                           |          | publico                           |        | audit |
| /api/roles/:id/users                     |          | publico                           |        |       |
| /api/roles/admin/permissions             |          | publico                           |        |       |
| /api/roles                               |          | publico                           |        | audit |
| /api/roles/setup                         |          | administrator                     | ⚠️ SQL | audit |
| /api/rooms/:id                           |          | publico                           |        | audit |
| /api/rooms/reorder                       |          | rooms.write                       |        | audit |
| /api/rooms                               |          | publico                           |        | audit |
| /api/sales/:id                           |          | publico                           |        | audit |
| /api/sales                               |          | publico                           |        | audit |
| /api/sales/stats                         |          | publico                           |        |       |
| /api/servicios/:id                       |          | publico                           |        | audit |
| /api/servicios/anulacion                 |          | authenticated                     | ⚠️ SQL | audit |
| /api/servicios/by-dates                  |          | publico                           |        |       |
| /api/servicios/procesar-anulacion        | POST     | SIN_WRAPPER                       | ⚠️ SQL |       |
| /api/servicios                           |          | publico                           |        | audit |
| /api/servicios/solicitud-anulacion       | GET POST | SIN_WRAPPER                       | ⚠️ SQL |       |
| /api/servicios/temporal                  |          | authenticated                     |        | audit |
| /api/servicios/user                      |          | authenticated                     |        | audit |
| /api/settings/backup/:id/download        |          | settings.read                     | ⚠️ SQL | audit |
| /api/settings/backup/:id/restore         |          | settings.write                    | ⚠️ SQL | audit |
| /api/settings/backup                     |          | settings.write                    | ⚠️ SQL | audit |
| /api/settings/database-clean             |          | settings.write                    |        | audit |
| /api/solicitudes-servicios/:id/aprobar   |          | orders.process                    |        | audit |
| /api/solicitudes-servicios/:id/rechazar  |          | orders.process                    |        | audit |
| /api/solicitudes-servicios/pending-count |          | publico                           | ⚠️ SQL |       |
| /api/solicitudes-servicios               |          | publico                           |        | audit |
| /api/stats/dashboard-summary             |          | dashboard.read                    |        | audit |
| /api/stats/logged-users                  |          | publico                           |        |       |
| /api/stats/sales-by-month                |          | publico                           |        |       |
| /api/stats/sales-by-week                 |          | publico                           |        |       |
| /api/swagger                             | GET      | SIN_WRAPPER                       |        |       |
| /api/test-auth                           |          | publico                           |        |       |
| /api/timers/active                       |          | publico                           |        |       |
| /api/tips/:id                            |          | publico                           |        |       |
| /api/tips                                |          | tips.read                         |        | audit |
| /api/tips/user                           |          | authenticated                     |        | audit |
| /api/transfers/:id/accept                |          | products.accept_transfer          |        | audit |
| /api/transfers/pending                   |          | products.read                     |        |       |
| /api/transfers                           |          | products.read                     |        |       |
| /api/users/:id/biometric/captura         |          | users.write                       |        | audit |
| /api/users/:id/biometric/devices         |          | users.read                        |        |       |
| /api/users/:id/biometric                 |          | users.write                       |        | audit |
| /api/users/:id/biometric/sync            |          | users.write                       |        | audit |
| /api/users/:id/biometric/verificar       |          | users.write                       |        | audit |
| /api/users/:id/permissions               |          | publico                           | ⚠️ SQL |       |
| /api/users/:id                           |          | users.write                       |        | audit |
| /api/users/me/stats                      |          | authenticated                     | ⚠️ SQL | audit |
| /api/users/profile                       |          | authenticated                     |        | audit |
| /api/users                               |          | users.write                       |        | audit |
| /api/users/status                        |          | authenticated                     |        | audit |
| /api/ventas/:id                          |          | publico                           |        | audit |
| /api/ventas/anulacion                    |          | sales.anulate                     | ⚠️ SQL | audit |
| /api/ventas/procesar-anulacion           | POST     | SIN_WRAPPER                       | ⚠️ SQL |       |
| /api/ventas/solicitud-anulacion          | GET      | SIN_WRAPPER                       | ⚠️ SQL |       |
| /api/whatsapp/webhook                    | POST     | SIN_WRAPPER                       | ⚠️ SQL |       |

## 8. Matriz de dependencias por capa

Importaciones entre capas técnicas. Las celdas vacías son las que el plan quiere
poder restringir.

_(sin resultados)_
