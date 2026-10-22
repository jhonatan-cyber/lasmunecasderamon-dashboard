# Paridad entre Expo y dashboard

Revisión local del 14 de octubre de 2026. No se realizaron commits,
publicaciones ni despliegues.

## Módulos personales

| Rol        | Módulos disponibles en ambas plataformas                                                  |
| ---------- | ----------------------------------------------------------------------------------------- |
| Cajero     | Asistencias, anticipos y solicitudes propias, propinas, horas extras, calendario          |
| Barman     | Asistencias, anticipos y solicitudes propias, propinas, horas extras, calendario          |
| Garzón     | Asistencias, anticipos y solicitudes propias, propinas, horas extras, calendario          |
| Anfitriona | Asistencias, anticipos y solicitudes propias, comisiones de ventas, servicios, calendario |

Las gratificaciones propias se consultan dentro de asistencias en ambas
plataformas. El flujo administrativo de solicitudes de gratificaciones del
cajero se conserva por separado.

En Expo el calendario se muestra en el inicio. En el dashboard tiene una vista
independiente. Los módulos operativos, como caja, pedidos y barra, mantienen sus
permisos específicos.

## Correcciones realizadas

- Anticipos: se habilitó la pestaña de solicitudes del dashboard para los cuatro
  roles, usando el formulario compartido existente. El historial de entregados
  excluye pendientes y rechazados, que se consultan en solicitudes.
- Asistencias: Expo inicia con el historial completo, como el dashboard. Cajero,
  barman y garzón conservan la consulta mensual como opción.
- Gratificaciones: el dashboard incorpora una consulta personal dentro de
  asistencias, mediante `/api/gratifications/me`.
- Propinas: Expo utiliza el endpoint personal también en la pantalla compartida
  de eventos financieros. Se unificaron las pantallas de cajero, barman y
  garzón.
- Horas extras: los tres roles usan la misma pantalla de Expo y el mismo
  endpoint personal.
- Importes y estados: los listados personales de Expo validan su formato y
  normalizan valores numéricos recibidos como texto, evitando concatenaciones y
  filtros incorrectos.
- Errores: los listados muestran el fallo y permiten reintentar; un error de
  carga no se presenta como un historial vacío.
- Calendario: se habilitó su presentación en el inicio de Expo para cajero y
  barman. La caché del inicio se identifica por usuario y rol.
- Anfitrionas: se agregaron errores recuperables a comisiones y servicios del
  dashboard. Se conservan la exclusión de comisiones anuladas del total y los
  permisos de edición existentes.

## Validación

- Expo: suite completa de 538 pruebas aprobadas y pruebas adicionales del inicio
  por rol; TypeScript y ESLint aprobados en los archivos modificados.
- Expo: exportación web local aprobada, incluyendo las rutas de los cuatro
  roles.
- Dashboard: 35 pruebas de módulos personales, solicitudes y gratificaciones; 61
  de navegación, permisos, caja, pedidos, barra y calendarios; 6 adicionales de
  comisiones, servicios y ordenamiento. Algunas pruebas se repiten entre grupos.
- Dashboard: TypeScript, ESLint y comprobación de componentes compartidos
  aprobados.
- Ambos formularios de inicio de sesión cargaron en el navegador.

Los envíos, aprobaciones y cobros de las pruebas utilizaron respuestas
simuladas. No se ejecutaron operaciones financieras reales para verificar la
aplicación.

## Límites de la comprobación manual

No había sesiones abiertas ni cuentas de prueba proporcionadas para entrar como
los cuatro roles. Por tanto, no se certifica una navegación manual completa con
sus datos reales ni una ejecución en dispositivos Android o iOS.

El bloqueo del comando de arranque combinado con una variable de entorno quedó
resuelto usando la configuración local estándar de Expo.
`.env.development.local`, excluido de Git, configura `http://192.168.0.11:3000`
únicamente en desarrollo. El arranque normal de Expo confirmó esa URL en su
registro; producción conserva el backend publicado. Pasaron las 18 pruebas de
resolución de la URL de API y ambos servidores respondieron correctamente. La
navegación manual con cuentas reales continúa pendiente.

## Revisión con API local y flujo de anticipos

- La suite de integración de Expo realizó 13 comprobaciones reales de conexión,
  CORS y autenticación con GET/OPTIONS; no creó movimientos financieros.
- Con sesión real de barman, el dashboard cargó asistencias, gratificaciones,
  anticipos, solicitudes, propinas y horas extras. Se verificó el cambio de
  orden de propinas. Expo abrió la misma cuenta y su historial de anticipos;
  hubo un timeout de carga recuperado con Reintentar.
- No se considera terminada la comprobación manual de los cuatro roles. El
  calendario y las demás pantallas de Expo requieren completar su recorrido.
- Se corrigió el hook administrativo que trataba al barman como administrador.
  El acceso global a anticipos también se bloquea en la API y en los controles
  de permisos del dashboard para ese rol.
- El barman solicita desde su módulo personal. Solo el administrador
  aprueba/rechaza; solo el cajero entrega una solicitud ya aprobada. La creación
  administrativa genera una solicitud y no descuenta efectivo directamente. Expo
  ya no aprueba y entrega en una sola acción.
- Las pruebas de entrega y aprobación usan servicios simulados; no se entregó
  dinero ni se generaron solicitudes reales durante la revisión.
- Corrección de conexión: durante la revisión cambió la IP Wi-Fi del equipo a
  `192.168.0.4`. Se actualizaron únicamente los archivos locales ignorados de
  desarrollo y se reiniciaron los servidores. Las 13 pruebas reales de API local
  volvieron a pasar con esta dirección. El dashboard requiere iniciar sesión de
  nuevo por el cambio de origen.
- Flujo de anticipos: 59 pruebas de middleware/repositorio/servicio/API, 17
  comprobaciones adicionales de acceso y formularios (7 repetidas) y 4 pruebas
  de acciones Expo aprobadas. TypeScript aprobado en ambos proyectos.
