# Revisión de módulos — 7 de octubre de 2026

Se revisaron los 14 módulos del dashboard mediante lectura de sus flujos principales, pruebas automatizadas y comprobaciones locales. Este informe describe el alcance comprobado; no constituye una validación completa de cada pantalla ni de dispositivos físicos.

## Resultado por módulo

| Módulo | Resultado y comprobación |
| --- | --- |
| Agenda | Verificados calendario e historial. Se corrigió el acceso a detalles de eventos ajenos y el filtro que excluía eventos del último día seleccionado. Regresiones ejecutadas con PostgreSQL. |
| Asistencia | Verificados desafíos QR, tokens vinculados al usuario, deduplicación de marcas y lógica de integración biométrica. Las pruebas de equipos usan simulaciones. |
| Auditoría | Verificados controles de rutas y registros. Se corrigió la fecha ausente en los registros de ventas y servicios, que provocaba fallos al escribirlos. |
| Caja | Verificados apertura, requisitos de caja abierta, retiros, anticipos, cierre autorizado e idempotencia mediante pruebas unitarias y PostgreSQL. |
| Clientes | Verificados recargas, prepago, devoluciones y actualización de saldos con PostgreSQL. |
| Comunicaciones | Verificados tokens, lógica de notificaciones y eventos SSE. Las pruebas de Redis pasaron; los transportes de Twilio y Expo se simularon. |
| Configuración | Verificados validación, protección de credenciales y restauración de respaldos. Se corrigió la conversión que truncaba porcentajes decimales. |
| Identidad | Verificados autenticación, permisos, roles, invalidación de sesiones y cachés de permisos e intentos fallidos. |
| Inventario | Verificados unidades, botellas, shots, aprobación de transferencias y restitución de stock al anular operaciones. |
| Operación | Verificados pedidos, cuentas, cobros, servicios, temporizadores y ciclo de habitaciones mediante pruebas unitarias y PostgreSQL. |
| Personal | Verificados comisiones, propinas, salarios, anticipos, gratificaciones y horas extra. Se rechazaron importes NaN e infinitos en anticipos y gratificaciones. |
| Reportes | Verificadas consultas de estadísticas y señales del dashboard. Performance y Forecast tienen pruebas; la proyección exige historial suficiente y una caja vigente. Personal incluye cajeros y barman y utiliza etiquetas compactas. |
| Salud | El endpoint local por IP respondió healthy y PostgreSQL respondió healthy. Esta comprobación corresponde al momento de la revisión. |
| Ventas | Verificados registro, totales, anulaciones parciales y completas, restitución de stock e idempotencia. Corregida la fecha de los registros de auditoría. |

## Correcciones de esta revisión

- Los usuarios que no son administradores solo pueden consultar detalles de eventos propios o de operaciones en las que participan. Los eventos no autorizados responden 404.
- Los filtros de agenda admiten límites independientes e incluyen todo el día final cuando se selecciona una fecha sin hora.
- Los valores decimales de configuración conservan su precisión; los anticipos y gratificaciones rechazan importes no finitos.
- Los registros de ventas y servicios incluyen la fecha requerida por PostgreSQL.
- Se actualizaron pruebas desfasadas de presentaciones, transferencias y anulación de servicios para comprobar el comportamiento vigente.
- Se ajustó el control de arquitectura para reconocer la base OAuth independiente del MCP y excluir dos archivos temporales locales sin eliminarlos.

## Validación ejecutada

- Suite unitaria completa: **1.824 pruebas aprobadas, 0 fallos, 2 omitidas**. Las omitidas requieren audio y reloj de equipos biométricos reales.
- PostgreSQL: **181 pruebas aprobadas en la suite completa**. Tras las últimas correcciones se ejecutaron nuevamente las regresiones de anulación, auditoría y propiedad de eventos, y la nueva prueba del límite de fecha; todas aprobaron.
- Redis: **27 pruebas aprobadas**, incluyendo SSE, límites de solicitudes, intentos fallidos y cachés.
- TypeScript: comprobación de tipos aprobada.
- ESLint: **0 errores y 27 advertencias**, principalmente por console en scripts e instrumentación existentes.
- El control de arquitectura pasó dentro de la suite unitaria.

Las pruebas PostgreSQL se ejecutaron en la base local aislada `lasmunecasderamon_review_20261007`, con usuarios ficticios. No se copiaron datos personales ni se ejecutaron las pruebas destructivas sobre la base de uso habitual. Se agregó una configuración reproducible en `vitest.review.config.ts` y sus fixtures en `tests/setup/review-fixtures.ts`.

## Alcance pendiente

- Comprobar físicamente lectores biométricos, audio y sincronización de reloj.
- Verificar entregas reales de Twilio y Expo; no se enviaron mensajes externos durante esta revisión.
- Recorrer visualmente todas las pantallas y probar la app en dispositivos reales conectados a la LAN.
- Medir rendimiento bajo carga. Se excluyó la prueba de línea base de rendimiento de la suite PostgreSQL funcional.
- Forecast requiere datos operativos válidos: se detectó una caja abierta por más de diez días e historial insuficiente de turnos válidos. La interfaz informa esta condición y no inventa una proyección. No se cerraron cajas ni se alteraron operaciones para fabricar datos.

La configuración local de pruebas utiliza `http://192.168.0.7:3000`. Si cambia la IP del equipo, habrá que actualizar los destinos de la app y del dashboard.

## Correcciones y comprobaciones adicionales

Ante la solicitud de resolver los pendientes se verificaron además ambas apps y la conexión real por LAN:

- **Dashboard:** compilación de producción (`next build --webpack`) completada correctamente, incluyendo TypeScript y generación de rutas. Se restauró el servidor de desarrollo por IP para continuar las pruebas locales.
- **App Expo:** 448 pruebas aprobadas y comprobación de tipos aprobada. La compilación web exportó sus 153 rutas. Se corrigió la caché de Metro en Windows para utilizar un directorio propio del proyecto y evitar el error de lectura en la caché temporal compartida. Se corrigieron las etiquetas accesibles de los días de meses adyacentes del calendario.
- **App Flutter:** análisis sin incidencias y **332 pruebas aprobadas**. Se corrigieron dos pruebas de calendario que intentaban pulsar un botón fuera del área visible: ahora desplazan la pantalla antes de pulsarlo.
- **Conexión real de la app:** inicio de sesión con el usuario de barman desde `http://192.168.0.7:8081`, consultando el dashboard en el puerto 3000. Se confirmó la conexión SSE establecida después de corregir las cabeceras CORS `Cache-Control` y `Last-Event-ID`.
- **Aislamiento de sesiones:** el proxy utiliza el Bearer explícito de la app antes que una cookie de otra sesión y no sustituye un Bearer inválido por el refresh de esa otra sesión. Las 34 pruebas del proxy pasaron.
- **Panel biométrico:** se corrigió la suscripción a `/api/sse`, que respondía 404, y el uso de un evento nombrado que no coincidía con los mensajes enviados por el servidor. Ahora comparte `/api/notifications/sse` y actualiza el estado al recibir `attendance_registered`; su regresión pasó.
- **Forecast:** muestra el motivo concreto de la falta de proyección, el número de turnos disponibles o los minutos restantes, y permite revisar la caja cuando está cerrada o demasiado antigua. Tres regresiones de interfaz pasaron.
- **Rendimiento local:** corregida la configuración del benchmark para cargar código de servidor en Vitest. En tres muestras, el composite sin caché tardó aproximadamente 558, 89 y 72 ms; con Redis, entre 1,5 y 1,8 ms. Las otras lecturas medidas tardaron entre 3 y 8 ms sin caché y entre 0,8 y 2,6 ms con caché. Son medidas locales de lectura, no una prueba de saturación de producción.
- **Navegación:** se verificaron pantallas con roles de barman y administrador, incluyendo dashboard, bar y sus pestañas, ventas y formulario, reportes, cajas, cuentas, privados, clientes, almacén, compras, categorías, propinas, comisiones, pagos, calendario de planillas y configuración. No se registraron ventas ni se ejecutaron pagos para comprobar la navegación.

### Lector pendiente de disponibilidad

El equipo “Puerta principal” mantiene registradas las MAC `e0:2e:fe:dc:e1:0b` y `e0:2e:fe:dc:e1:0a`. Tras sondear la subred local `192.168.0.0/24` y revisar la tabla de vecinos, ninguna apareció. La IP guardada `192.168.0.5` resolvió a una MAC diferente. No se asignó al lector la IP de otro equipo. Para completar la verificación física debe estar conectado a esta red; después puede utilizarse la búsqueda por MAC existente, que confirma también el serial antes de actualizar la IP.
