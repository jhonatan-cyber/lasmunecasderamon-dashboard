# Diagnóstico de arquitectura — Fase 0

Generado por `scripts/arquitectura/analisis.mjs`. No modificar a mano.

| Métrica                                    | Valor  |
| ------------------------------------------ | ------ |
| Archivos analizados                        | 1606   |
| Rutas HTTP                                 | 204    |
| **Rutas con SQL directo**                  | **0**  |
| **Archivos con SQL fuera de repositorios** | **66** |
| Tablas con más de un escritor              | 17     |
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
| raiz             | 30               |
| lib/services     | 7                |
| lib/otros        | 5                |
| lib/integrations | 2                |
| lib/identidad    | 2                |
| lib/database     | 3                |
| lib/business     | 6                |

<details><summary>Detalle por archivo</summary>

| Archivo                                                | Capa             | Tablas que escribe                                              |
| ------------------------------------------------------ | ---------------- | --------------------------------------------------------------- |
| scripts/clean-sync-probes.js                           | scripts          | sync_operations                                                 |
| scripts/compare-schema.mjs                             | scripts          | —                                                               |
| scripts/db_test.js                                     | scripts          | —                                                               |
| scripts/lib/twilio-config.js                           | scripts          | —                                                               |
| scripts/postgres-migrations.mjs                        | scripts          | _postgres_migrations                                            |
| scripts/purge-query-logs.js                            | scripts          | query_logs                                                      |
| scripts/reconcile-migration-checksum.mjs               | scripts          | _postgres_migrations                                            |
| scripts/run-integration-all.js                         | scripts          | —                                                               |
| scripts/test-whatsapp.ts                               | scripts          | —                                                               |
| scripts/verify-migrations.mjs                          | scripts          | —                                                               |
| scripts/verify-schema-parity.mjs                       | scripts          | —                                                               |
| modules/asistencia/biometrico/avisosAudio.ts           | raiz             | —                                                               |
| modules/asistencia/biometrico/clockSync.ts             | raiz             | —                                                               |
| modules/asistencia/biometrico/deviceAuth.ts            | raiz             | biometric_devices                                               |
| modules/asistencia/biometrico/enrollmentService.ts     | raiz             | biometric_devices, biometric_plantillas, usuarios               |
| modules/asistencia/biometrico/eventListener.ts         | raiz             | —                                                               |
| modules/asistencia/biometrico/identificacionFacial.ts  | raiz             | biometric_device_records, biometric_plantillas                  |
| modules/asistencia/biometrico/ipDiscovery.ts           | raiz             | biometric_devices                                               |
| modules/asistencia/biometrico/ipWatcher.ts             | raiz             | —                                                               |
| modules/asistencia/biometrico/processBiometricEvent.ts | raiz             | —                                                               |
| modules/asistencia/biometrico/recordPhotos.ts          | raiz             | biometric_device_records                                        |
| modules/asistencia/biometrico/recordPoller.ts          | raiz             | —                                                               |
| modules/asistencia/biometrico/statusService.ts         | raiz             | —                                                               |
| modules/asistencia/biometrico/unenrollmentService.ts   | raiz             | biometric_plantillas, usuarios                                  |
| modules/asistencia/biometrico/verificacionRemota.ts    | raiz             | —                                                               |
| modules/asistencia/biometrico/videoStream.ts           | raiz             | —                                                               |
| modules/asistencia/kioskos/attendanceChallenges.ts     | raiz             | asistencia_desafios                                             |
| modules/asistencia/kioskos/deviceAuth.ts               | raiz             | kiosk_devices                                                   |
| modules/inventario/anulaciones/servicio.ts             | raiz             | —                                                               |
| modules/inventario/bar/configuracion.ts                | raiz             | —                                                               |
| modules/inventario/compras/servicio.ts                 | raiz             | —                                                               |
| modules/inventario/envases/servicio.ts                 | raiz             | —                                                               |
| modules/inventario/presentaciones/servicio.ts          | raiz             | —                                                               |
| modules/inventario/productos/servicio.ts               | raiz             | —                                                               |
| modules/inventario/tipos.ts                            | raiz             | —                                                               |
| modules/inventario/transferencias/servicio.ts          | raiz             | —                                                               |
| modules/inventario/unidades/servicio.ts                | raiz             | —                                                               |
| modules/operacion/cuentas/alta.ts                      | raiz             | —                                                               |
| modules/operacion/servicios/creacion.ts                | raiz             | —                                                               |
| modules/ventas/registro/servicio.ts                    | raiz             | —                                                               |
| proxy.ts                                               | raiz             | —                                                               |
| lib/services/AuditService.ts                           | lib/services     | —                                                               |
| lib/services/PermissionService.ts                      | lib/services     | —                                                               |
| lib/services/RoomManager.ts                            | lib/services     | habitaciones, servicios, ventas                                 |
| lib/services/SaleService.ts                            | lib/services     | —                                                               |
| lib/services/SecurityAlertService.ts                   | lib/services     | —                                                               |
| lib/services/ServiceService.ts                         | lib/services     | —                                                               |
| lib/services/WithdrawalService.ts                      | lib/services     | cajas                                                           |
| lib/notifications/orderNotificationUtils.ts            | lib/otros        | —                                                               |
| lib/transaccion/compatibilidad.ts                      | lib/otros        | —                                                               |
| lib/transaccion/contrato.ts                            | lib/otros        | —                                                               |
| lib/transaccion/infraestructura.ts                     | lib/otros        | —                                                               |
| lib/utils/logUtils.ts                                  | lib/otros        | servicio_logs, venta_logs                                       |
| lib/integrations/pushNotifications.ts                  | lib/integrations | usuarios                                                        |
| lib/integrations/whatsappPendingActions.ts             | lib/integrations | cuentas, detalle_cuentas, solicitudes_anulacion_cuentas, ventas |
| lib/auth/auth.ts                                       | lib/identidad    | logins                                                          |
| lib/middleware/auth.ts                                 | lib/identidad    | —                                                               |
| lib/database/db.ts                                     | lib/database     | —                                                               |
| lib/database/maintenance.ts                            | lib/database     | backups                                                         |
| lib/database/perfilConsultas.ts                        | lib/database     | —                                                               |
| lib/business/codigoService.ts                          | lib/business     | codigos                                                         |
| lib/business/containerAlerts.ts                        | lib/business     | —                                                               |
| lib/business/pagosMixtos.ts                            | lib/business     | clientes, clientes_prepago_movimientos, cuentas                 |
| lib/business/shotAlerts.ts                             | lib/business     | —                                                               |
| lib/business/twilioConfig.ts                           | lib/business     | —                                                               |
| lib/business/whatsappConfig.ts                         | lib/business     | —                                                               |

</details>

## 2. Propiedad de tablas

Tablas que escriben más de un repositorio. Son las escrituras cruzadas que el
principio 1 del plan quiere eliminar: cada tabla debería tener un único módulo
propietario.

| Tabla                  | Escritores | Repositorios                                                                                                                                                                                                                                 |
| ---------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| asistencias            | 2          | lib/repositories/PayrollRepository.ts<br>lib/repositories/auth/AuthQueries.ts                                                                                                                                                                |
| cajas                  | 3          | lib/repositories/CashRegisterRepository.ts<br>lib/repositories/service/ServiceQueries.ts<br>modules/caja/movimientos/repositorio.ts                                                                                                          |
| clientes               | 2          | lib/repositories/ClientRepository.ts<br>modules/clientes/prepago/repositorio.ts                                                                                                                                                              |
| cuentas                | 2          | lib/repositories/cuenta/CuentaQueries.ts<br>modules/operacion/cuentas/repositorio.ts                                                                                                                                                         |
| detalle_comisiones     | 2          | lib/repositories/PayrollRepository.ts<br>modules/personal/conceptos/repositorio.ts                                                                                                                                                           |
| detalle_propinas       | 2          | lib/repositories/PayrollRepository.ts<br>modules/personal/conceptos/repositorio.ts                                                                                                                                                           |
| detalle_servicios      | 2          | lib/repositories/service/ServiceQueries.ts<br>modules/operacion/servicios/repositorio.ts                                                                                                                                                     |
| detalle_ventas         | 3          | lib/repositories/sale/SaleQueries.ts<br>modules/ventas/anulaciones/repositorio.ts<br>modules/ventas/registro/repositorio.ts                                                                                                                  |
| inventario_movimientos | 2          | modules/inventario/anulaciones/repositorio.ts<br>modules/inventario/bar/consumoRepositorio.ts                                                                                                                                                |
| inventario_unidades    | 5          | modules/inventario/anulaciones/repositorio.ts<br>modules/inventario/bar/consumoRepositorio.ts<br>modules/inventario/envases/repositorio.ts<br>modules/inventario/transferencias/repositorio.ts<br>modules/inventario/unidades/repositorio.ts |
| logins                 | 2          | lib/repositories/CashRegisterRepository.ts<br>lib/repositories/auth/AuthQueries.ts                                                                                                                                                           |
| permissions            | 2          | lib/repositories/PermissionRepository.ts<br>modules/identidad/permisos/repositorio.ts                                                                                                                                                        |
| role_permissions       | 2          | lib/repositories/RoleRepository.ts<br>modules/identidad/permisos/repositorio.ts                                                                                                                                                              |
| servicios              | 4          | lib/repositories/TimerRepository.ts<br>lib/repositories/service/ServiceQueries.ts<br>modules/operacion/servicios/repositorio.ts<br>modules/operacion/temporizadores/repositorio.ts                                                           |
| usuarios               | 2          | lib/repositories/auth/AuthQueries.ts<br>modules/identidad/usuarios/repositorio.ts                                                                                                                                                            |
| ventas                 | 3          | lib/repositories/TimerRepository.ts<br>lib/repositories/sale/SaleQueries.ts<br>modules/ventas/anulaciones/repositorio.ts                                                                                                                     |
| ventas_usuarios        | 2          | lib/repositories/sale/SaleQueries.ts<br>modules/ventas/registro/repositorio.ts                                                                                                                                                               |

## 3. Ciclos entre dominios

| Ciclo                                                         |
| ------------------------------------------------------------- |
| identidad → personal → identidad                              |
| identidad → personal → comunicaciones → identidad             |
| comunicaciones → ventas → comunicaciones                      |
| personal → comunicaciones → ventas → personal                 |
| comunicaciones → operacion → comunicaciones                   |
| identidad → personal → comunicaciones → operacion → identidad |

## 4. Transacciones

| Archivo con withTransaction/enUnaUnidad                | Capa             |
| ------------------------------------------------------ | ---------------- |
| lib/database/maintenance.ts                            | lib/database     |
| lib/repositories/CashRegisterRepository.ts             | lib/repositories |
| lib/repositories/CategoryRepository.ts                 | lib/repositories |
| lib/repositories/OrderRepository.ts                    | lib/repositories |
| lib/repositories/PayrollRepository.ts                  | lib/repositories |
| lib/repositories/RoleRepository.ts                     | lib/repositories |
| lib/repositories/TipRepository.ts                      | lib/repositories |
| lib/repositories/cuenta/CuentaQueries.ts               | lib/repositories |
| lib/repositories/gratificacion/GratificacionQueries.ts | lib/repositories |
| lib/repositories/sale/SaleQueries.ts                   | lib/repositories |
| lib/repositories/service/ServiceQueries.ts             | lib/repositories |
| lib/services/SaleService.ts                            | lib/services     |
| lib/services/WithdrawalService.ts                      | lib/services     |
| lib/transaccion/contrato.ts                            | lib/otros        |
| modules/asistencia/biometrico/enrollmentService.ts     | raiz             |
| modules/asistencia/biometrico/unenrollmentService.ts   | raiz             |
| modules/asistencia/kioskos/deviceAuth.ts               | raiz             |
| modules/asistencia/marcas/repositorio.ts               | raiz             |
| modules/clientes/prepago/servicio.ts                   | raiz             |
| modules/identidad/permisos/repositorio.ts              | raiz             |
| modules/inventario/anulaciones/servicio.ts             | raiz             |
| modules/inventario/compras/servicio.ts                 | raiz             |
| modules/inventario/envases/servicio.ts                 | raiz             |
| modules/inventario/presentaciones/servicio.ts          | raiz             |
| modules/inventario/productos/servicio.ts               | raiz             |
| modules/inventario/transferencias/servicio.ts          | raiz             |
| modules/inventario/unidades/servicio.ts                | raiz             |
| modules/operacion/cuentas/actualizacion.ts             | raiz             |
| modules/operacion/cuentas/alta.ts                      | raiz             |
| modules/operacion/cuentas/temporizadores.ts            | raiz             |
| modules/operacion/servicios/anulaciones.ts             | raiz             |
| modules/operacion/servicios/creacion.ts                | raiz             |
| modules/operacion/temporizadores/servicio.ts           | raiz             |
| modules/personal/anticipos/repositorio.ts              | raiz             |
| modules/personal/anticipos/servicio.ts                 | raiz             |
| modules/ventas/anulaciones/servicio.ts                 | raiz             |
| workflows/cobrar-cuenta.ts                             | raiz             |

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
| lib/store/timerStore.ts                           | 164   | tickInterval = setInterval(() => {                                |
| modules/asistencia/biometrico/ipWatcher.ts        | 105   | timer = setInterval(arrancar, intervaloVigilanciaIp());           |
| modules/asistencia/biometrico/recordPoller.ts     | 360   | estado.timer = setInterval(() => {                                |

## 6. Cachés

| Archivo                                      | Línea | Tipo                                                                      |
| -------------------------------------------- | ----- | ------------------------------------------------------------------------- |
| lib/api/sseBus.ts                            | 112   | publisher = new Redis(process.env.REDIS_URL!, options);                   |
| lib/api/sseBus.ts                            | 113   | subscriber = new Redis(process.env.REDIS_URL!, options);                  |
| lib/auth/failed-login-store.ts               | 111   | client = new Redis(this.url!, {                                           |
| lib/auth/permissions-cache.ts                | 101   | client = new Redis(this.url, {                                            |
| lib/cache/redisDashboardCache.ts             | 47    | const client = new Redis(this.url, {                                      |
| lib/cache/redisWindowCounter.ts              | 99    | client = new Redis(this.url!, {                                           |
| lib/middleware/redisRateLimit.ts             | 69    | client = new Redis(process.env.REDIS_URL \|\| 'redis://localhost:6379', { |
| lib/middleware/redisRateLimit.ts             | 132   | throw new Error('Respuesta inválida del limitador Redis');                |
| scripts/arquitectura/analisis.mjs            | 330   | /\bnew (Redis\|RedisClient\|ioredis)\b/.test(linea) \|\|                  |
| scripts/redis-dev.js                         | 6     | const client = new Redis(url, {                                           |
| components/shared/ProductPhoto.tsx           | —     | caché en memoria (new Map + cache)                                        |
| hooks/shared/useConfigValue.ts               | —     | caché compartida en globalThis                                            |
| lib/api/sseBus.ts                            | —     | caché compartida en globalThis                                            |
| lib/auth/failed-login-store.ts               | —     | caché en memoria (new Map + cache)                                        |
| lib/auth/permissions-cache.ts                | —     | caché en memoria (new Map + cache)                                        |
| lib/database/db.ts                           | —     | caché compartida en globalThis                                            |
| modules/asistencia/biometrico/netSdk.ts      | —     | caché compartida en globalThis                                            |
| modules/asistencia/biometrico/videoStream.ts | —     | caché en memoria (new Map + cache)                                        |
| scripts/arquitectura/analisis.mjs            | —     | caché compartida en globalThis                                            |

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
| /api/anticipos/maximo                    |          | authenticated                     |        | audit |
| /api/anticipos                           |          | advances.read                     |        | audit |
| /api/anticipos/solicitud-detalles        |          | publico                           |        |       |
| /api/anticipos/solicitudes               |          | advances.read                     |        | audit |
| /api/anticipos/user                      |          | authenticated                     |        | audit |
| /api/attendance/:id/detalle              |          | publico                           |        |       |
| /api/attendance/by-dates                 |          | authenticated                     |        | audit |
| /api/attendance/hoy                      |          | publico                           |        |       |
| /api/attendance/masivo                   |          | attendance.write                  |        | audit |
| /api/attendance/qr                       |          | attendance.write                  |        | audit |
| /api/attendance/register                 |          | publico                           |        |       |
| /api/attendance                          |          | publico                           |        | audit |
| /api/attendance/stats                    |          | publico                           |        |       |
| /api/attendance/user                     |          | authenticated                     |        | audit |
| /api/audit-logs                          |          | publico                           |        |       |
| /api/auth/change-password                |          | authenticated                     |        | audit |
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
| /api/biometric/devices/:id/poller        |          | administrator                     |        | audit |
| /api/biometric/devices/:id/resync        |          | administrator                     |        | audit |
| /api/biometric/devices/:id               |          | administrator                     |        | audit |
| /api/biometric/devices/:id/snapshot      |          | administrator                     |        |       |
| /api/biometric/devices/:id/video         |          | administrator                     |        |       |
| /api/biometric/devices                   |          | administrator                     |        | audit |
| /api/biometric/records/:id/foto          |          | authenticated                     |        |       |
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
| /api/clients/devolucion/aprobar          |          | clients.write                     |        | audit |
| /api/clients/devolucion/recordatorio     |          | clients.write                     |        | audit |
| /api/clients/devolucion                  |          | clients.write                     |        | audit |
| /api/clients/devolucion/solicitudes      |          | clients.read                      |        |       |
| /api/clients/history                     |          | publico                           |        |       |
| /api/clients/prepago                     |          | clients.write                     |        | audit |
| /api/clients                             |          | publico                           |        | audit |
| /api/codigo/actual                       |          | authenticated                     |        | audit |
| /api/commissions/:id/details             |          | publico                           |        |       |
| /api/commissions/:id                     |          | commissions.write                 |        | audit |
| /api/commissions                         |          | publico                           |        | audit |
| /api/commissions/user                    |          | authenticated                     |        | audit |
| /api/configurations                      |          | settings.write                    |        | audit |
| /api/cron/check-timers                   |          | publico                           |        |       |
| /api/csp-violation                       | POST     | SIN_WRAPPER                       |        |       |
| /api/cuentas/:id/cobrar-con-venta        |          | finances.write                    |        | audit |
| /api/cuentas/:id/cobrar                  |          | finances.write                    |        | audit |
| /api/cuentas/:id                         |          | publico                           |        | audit |
| /api/cuentas/:id/stop                    |          | finances.write                    |        | audit |
| /api/cuentas/anulacion                   |          | finances.write                    |        | audit |
| /api/cuentas/procesar-anulacion          | POST     | SIN_WRAPPER                       |        |       |
| /api/cuentas                             |          | publico                           |        | audit |
| /api/cuentas/solicitud-anulacion         | GET      | SIN_WRAPPER                       |        |       |
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
| /api/health                              |          | publico                           |        |       |
| /api/images/products/:id                 | GET      | SIN_WRAPPER                       |        |       |
| /api/kiosk/attendance/challenge          | POST     | SIN_WRAPPER                       |        |       |
| /api/kiosk/board                         | GET      | SIN_WRAPPER                       |        |       |
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
| /api/orders/check-active-room            |          | publico                           |        |       |
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
| /api/permissions/setup-cajero            |          | administrator                     |        | audit |
| /api/ping                                |          | publico                           |        |       |
| /api/products/:id                        |          | products.write                    |        | audit |
| /api/products/:id/tiers                  |          | publico                           |        | audit |
| /api/products/for-sale                   |          | publico                           |        |       |
| /api/products/presentations              |          | publico                           |        | audit |
| /api/products/reorder                    |          | products.write                    |        | audit |
| /api/products                            |          | publico                           |        | audit |
| /api/products/units/printed              |          | products.write                    |        | audit |
| /api/products/units                      |          | publico                           |        | audit |
| /api/public/users                        | GET      | SIN_WRAPPER                       |        |       |
| /api/purchases                           |          | products.read                     |        |       |
| /api/reports/cash-register               |          | publico                           |        |       |
| /api/reports/commissions                 |          | publico                           |        |       |
| /api/reports/sales                       |          | publico                           |        |       |
| /api/reviews                             |          | publico                           |        |       |
| /api/roles/:id/permissions               |          | publico                           |        | audit |
| /api/roles/:id                           |          | publico                           |        | audit |
| /api/roles/:id/users                     |          | publico                           |        |       |
| /api/roles/admin/permissions             |          | publico                           |        |       |
| /api/roles                               |          | publico                           |        | audit |
| /api/roles/setup                         |          | administrator                     |        | audit |
| /api/rooms/:id                           |          | publico                           |        | audit |
| /api/rooms/reorder                       |          | rooms.write                       |        | audit |
| /api/rooms                               |          | publico                           |        | audit |
| /api/sales/:id                           |          | publico                           |        | audit |
| /api/sales                               |          | publico                           |        | audit |
| /api/sales/stats                         |          | publico                           |        |       |
| /api/servicios/:id                       |          | publico                           |        | audit |
| /api/servicios/anulacion                 |          | authenticated                     |        | audit |
| /api/servicios/by-dates                  |          | publico                           |        |       |
| /api/servicios/procesar-anulacion        | POST     | SIN_WRAPPER                       |        |       |
| /api/servicios                           |          | publico                           |        | audit |
| /api/servicios/solicitud-anulacion       | GET POST | SIN_WRAPPER                       |        |       |
| /api/servicios/temporal                  |          | authenticated                     |        | audit |
| /api/servicios/user                      |          | authenticated                     |        | audit |
| /api/settings/backup/:id/download        |          | settings.read                     |        | audit |
| /api/settings/backup/:id/restore         |          | settings.write                    |        | audit |
| /api/settings/backup                     |          | settings.write                    |        | audit |
| /api/settings/database-clean             |          | settings.write                    |        | audit |
| /api/solicitudes-servicios/:id/aprobar   |          | orders.process                    |        | audit |
| /api/solicitudes-servicios/:id/rechazar  |          | orders.process                    |        | audit |
| /api/solicitudes-servicios/pending-count |          | publico                           |        |       |
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
| /api/users/:id/permissions               |          | publico                           |        |       |
| /api/users/:id                           |          | users.write                       |        | audit |
| /api/users/me/stats                      |          | authenticated                     |        | audit |
| /api/users/profile                       |          | authenticated                     |        | audit |
| /api/users                               |          | users.write                       |        | audit |
| /api/users/status                        |          | authenticated                     |        | audit |
| /api/ventas/:id                          |          | publico                           |        | audit |
| /api/ventas/anulacion                    |          | sales.anulate                     |        | audit |
| /api/ventas/procesar-anulacion           | POST     | SIN_WRAPPER                       |        |       |
| /api/ventas/solicitud-anulacion          | GET      | SIN_WRAPPER                       |        |       |
| /api/whatsapp/webhook                    | POST     | SIN_WRAPPER                       |        |       |

## 8. Matriz de dependencias por capa

Importaciones entre capas técnicas. Las celdas vacías son las que el plan quiere
poder restringir.

_(sin resultados)_
