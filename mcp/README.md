# MCP del dashboard

## Acceso exclusivo del administrador y solicitudes

El MCP está dirigido **únicamente a administradores activos**. OAuth verifica
`/api/mcp/admin/session` antes de emitir la autorización; HTTP comprueba la
identidad actual en cada petición y cada herramienta vuelve a verificarla. Stdio
comprueba el administrador antes de abrir la conexión y en cada ejecución.
Un cambio de rol o la desactivación bloquean el acceso aunque el token no haya
expirado. El rol del JWT por sí solo no autoriza acceso. No se conecta directamente
a PostgreSQL: consume la API autenticada del dashboard.

Hay **33 herramientas** en modo normal: 23 consultas y 10 operaciones. OAuth con
`mcp:read` publica únicamente las 23 consultas. `mcp:write` habilita operaciones;
no permite conectar a otros roles. Las cuatro herramientas de desarrollo siguen
siendo exclusivas de stdio y requieren la misma identidad administradora.

Herramientas añadidas:

| Herramienta | Uso |
| --- | --- |
| `solicitudes_pendientes` | Bandeja de nueve tipos: anticipos, devoluciones, gratificaciones, servicios, transferencias, cierres, anulaciones de ventas, servicios y cuentas. |
| `detalle_solicitud` | Identificador, monto, estado y efecto de la aprobación. |
| `limite_anticipo_empleado` | Máximo y balance del beneficiario; nunca del administrador por defecto. |
| `buscar_personal` | Buscar empleados activos por nombre o nick; resolver coincidencias antes de operar. |
| `solicitar_anticipo_empleado` | Crear un anticipo pendiente para el beneficiario indicado. |
| `solicitar_devolucion_cliente` | Crear una devolución pendiente de saldo prepago. |
| `solicitar_gratificacion_empleado` | Crear una gratificación pendiente de aprobación. |
| `solicitar_transferencia_bar` | Reservar unidades y crear una transferencia pendiente al bar. |
| `solicitar_anulacion` | Solicitar anulación de venta, servicio o cuenta. |
| `solicitar_servicio` | Crear una solicitud pendiente con habitación, anfitrionas y valores explícitos. |
| `resolver_solicitud` | Aprobar o rechazar una solicitud por tipo e identificador. |
| `entregar_anticipo` | Registrar entrega real y descontar efectivo de caja, separado de aprobar. |
| `cerrar_caja_administrador` | Cerrar directamente o resolver el cierre pendiente como administrador. |

Consultas de negocio (producto, almacén, caja, reportes y auditoría), todas de
sólo lectura:

| Herramienta | Uso |
| --- | --- |
| `buscar_producto` | Catálogo: `term` (tiene prioridad), `category_id` y `para_venta` para el stock del bar. |
| `detalle_producto` | Producto por id con presentaciones, precios y stock. |
| `listar_transferencias` | Stock del bar e historial de transferencias almacén → bar (`items`, `history`). |
| `transferencias_pendientes` | Pendientes de aceptar o rechazar; resolverlas queda fuera del MCP. |
| `historial_cajas` | Turnos de caja; `con_resumen` devuelve sólo el agregado. |
| `reporte_ventas` | Totales por método de pago, ventas por día y shots; `period` y rango `custom`. |
| `auditoria_reciente` | Últimos eventos de auditoría, `limit` 1–200 (por defecto 50). |

Ejemplos de solicitudes al asistente: «Muéstrame los anticipos pendientes»,
«Busca a Ana y consulta su máximo de anticipo», «Solicita 200 para Ana por
emergencia» y «Revisa la devolución del cliente antes de aprobarla».

Las escrituras requieren `confirmar: true` tras confirmación explícita del
administrador y un `operacion_id` UUID nuevo por intención. Ante una respuesta
perdida, se conserva el mismo UUID y payload; el backend replica el resultado
sin repetir la operación. Si cambia el payload, se rechaza reutilizar la clave.
Si una operación falla o queda en curso, no se reejecuta automáticamente:
consultar el estado antes de decidir cómo continuar. La confirmación expresa la
autorización del administrador; el cliente debe obtenerla, no rellenarla por
su cuenta. `cobrar_cuenta` también exige `confirmar: true` y un `operacion_id`
UUID, que sale como cabecera `x-idempotency-key`; reintentar con el mismo UUID
replica la respuesta guardada en `/api/cuentas/{id}/cobrar` sin cobrar dos veces.

Antes de resolver, consultar `detalle_solicitud` y enviar su `monto` como
`monto_esperado` (transferencias: 0; confirmar también producto y cantidad).
Aprobar un anticipo **no entrega dinero**. Aprobar una gratificación la deja por
pagar en planilla. Aprobar una devolución **descuenta saldo y registra la
devolución**, sin emitir una transferencia bancaria. El cierre recalcula sus
montos en el backend. El administrador puede recibir transferencias, pero la
recepción debe hacerla una persona distinta de quien envió.

La bandeja tiene paginación por grupo: `limit` (1–50, por defecto 20), `offset`,
`total` y `hay_mas`. No sumar dinero de distintos tipos como si fueran egresos.
Anticipos y devoluciones admiten detalle después de resolver; los demás tipos
consultan solicitudes pendientes. Los tokens de enlaces públicos no se devuelven.

Todas las herramientas declaran `outputSchema` y devuelven resultados estructurados.
Las consultas, solicitudes y cobros devuelven el mismo sobre en el texto JSON y en
`structuredContent`. Los errores incluyen `structuredContent.error` e `isError`.
`verificar_conexion` conserva su diagnóstico en crudo.

El límite de 20 000 caracteres se aplica al resultado serializado: si lo supera,
ambos canales devuelven `resultado: null`, metadatos `truncado` y un `aviso` para
reducir la página o usar filtros. Nunca se devuelve un prefijo incompleto como datos.
Este aviso no indica que una escritura haya fallado: no repetirla con otra clave.

`listar_cuentas`, `buscar_producto`, `listar_transferencias`,
`transferencias_pendientes`, `historial_cajas` y `buscar_personal` admiten
`limit` (1–100, por defecto 20) y `offset` (por defecto 0). Las listas pasan a
`{ items, total, limit, offset, hay_mas }`. En transferencias, `items` y
`history` contienen cada uno ese sobre. El resumen de cajas conserva su formato.
La paginación se aplica en el adaptador MCP: las APIs existentes todavía envían
listas completas al servidor MCP; no reduce las consultas a la base de datos.
La bandeja de solicitudes conserva su paginación en el backend por grupo (1–50).

Las rutas `/api/mcp/admin/session` y `/api/mcp/admin/solicitudes` comprueban el
administrador activo en la base de datos. La segunda registra la identidad
autenticada como actor; el beneficiario es un campo separado. Usa servicios
públicos de los módulos y las transacciones de negocio existentes. No requiere
migraciones nuevas; la idempotencia utiliza `sync_operations` (migración 040).

Después de actualizar, compilar con `pnpm --dir mcp build` y reiniciar el proceso
MCP y el dashboard para cargar las nuevas rutas. Una instalación externa debe
recibir un nuevo paquete generado con `npm pack`; los paquetes antiguos no cambian
automáticamente.

## Conexión remota con OAuth 2.1

La versión 0.2.0 añade **Streamable HTTP + OAuth Authorization Code con PKCE
S256**. Stdio continúa disponible. El cliente remoto abre un navegador para
iniciar sesión y autorizar acceso; ya no necesita guardar la contraseña del
dashboard en su configuración.

Requiere **Node.js 24 o superior**. Compila con `pnpm --dir mcp build` y arranca
con `pnpm --dir mcp start:http`. Las variables se definen en el entorno del
proceso; el servidor HTTP no carga archivos `.env` automáticamente.

Ejemplo local en PowerShell desde la raíz del repositorio:

Para uso local directo, ejecuta `node mcp/scripts/start-local.mjs`. Arranca en
`http://127.0.0.1:3001/mcp`, conecta al dashboard en el puerto 3000 y genera una
clave persistente en `mcp/.data/oauth.key` (excluida de Git). Reutiliza esa clave
en los siguientes arranques. Después registra el servidor en Codex con
`codex mcp add lasmunecas --url http://127.0.0.1:3001/mcp --oauth-client-registration dcr`
y completa el login OAuth en el navegador.

También puedes configurar el proceso manualmente:

```powershell
$env:MCP_PUBLIC_URL = 'http://127.0.0.1:3001'
$env:MCP_BASE_URL = 'http://127.0.0.1:3000'
$env:MCP_PORT = '3001'
$env:MCP_OAUTH_STORE_KEY = node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64'))"
pnpm --dir mcp start:http
```

Genera la clave **una sola vez** y consérvala en el almacén de secretos del
servidor. Si se cambia o pierde, las autorizaciones persistidas no se pueden
descifrar. El ejemplo genera una clave nueva cada vez para pruebas locales; no
lo repitas contra una base de autorizaciones que quieras conservar.

Conecta un cliente que soporte MCP remoto con OAuth usando
`http://127.0.0.1:3001/mcp` para pruebas locales. En producción publica una URL
como `https://mcp.tu-dominio.com/mcp`, con TLS y proxy inverso que conserve el
header **Host** original y reenvíe todas las rutas del servicio OAuth.
`MCP_PUBLIC_URL` debe ser ese origen HTTPS, sin subrutas. El proceso escucha en
loopback por defecto; `MCP_HOST` permite cambiarlo si el despliegue lo requiere.
También se exige HTTPS para `MCP_BASE_URL`, excepto cuando apunta a loopback.

| Variable               | Uso                                                                                                      |
| ---------------------- | -------------------------------------------------------------------------------------------------------- |
| `MCP_PUBLIC_URL`       | Origen público del MCP, sin `/mcp`; obligatorio.                                                         |
| `MCP_BASE_URL`         | URL del dashboard que verifica las cuentas y los permisos.                                               |
| `MCP_OAUTH_STORE_KEY`  | Clave AES de 32 bytes en base64; obligatoria y estable.                                                  |
| `MCP_OAUTH_DB`         | Ruta de SQLite cifrado; por defecto `.data/mcp-oauth.sqlite` relativa al directorio de ejecución.        |
| `MCP_HOST`, `MCP_PORT` | Dirección de escucha y puerto; `127.0.0.1:3001` por defecto.                                             |
| `MCP_TRUSTED_PROXIES` | IPs/subredes de proxies confiables separadas por coma; vacío por defecto. Sólo esos proxies pueden aportar la IP del cliente mediante X-Forwarded-For. |
| `MCP_ALLOWED_ORIGINS`  | Orígenes de clientes web separados por coma; sólo los configurados pueden llamar `/mcp` desde navegador. |

El login es individual, incluye el código de turno cuando corresponde, y
requiere consentimiento explícito. `mcp:read` permite consultas; `mcp:write`
habilita las operaciones de escritura además de lectura. El backend conserva sus
controles de roles y permisos: el scope nunca los amplía. El cobro mantiene la
exigencia de confirmación explícita indicada por su herramienta. Las
herramientas de desarrollo nunca se publican por HTTP.

Endpoints: `/mcp`, `/authorize`, `/oauth/consent`, `/token`, `/register`,
`/revoke`, `/.well-known/oauth-authorization-server` y
`/.well-known/oauth-protected-resource/mcp`. Se admite registro dinámico (DCR)
de clientes públicos o confidenciales; Client ID Metadata Documents no está
implementado. Los redirects deben ser HTTPS o HTTP de loopback registrado.

Los códigos duran 60 segundos y se consumen una vez. Los access tokens duran 15
minutos y las autorizaciones un máximo de 7 días. Los refresh tokens se rotan y
su reutilización revoca la autorización completa. `/revoke` también invalida
todos los tokens del consentimiento. Cada token está ligado al cliente y al
recurso `/mcp`; un JWT del dashboard no sirve como token OAuth del MCP.

El estado se cifra con AES-256-GCM en SQLite. Conserva el archivo y su clave
entre reinicios. SQLite y la caché de sesiones soportan **una sola instancia**
del servidor; no despliegues múltiples procesos contra la misma base. Los tokens
internos del dashboard permanecen en el servidor, separados de los tokens MCP.
Se aplican límites de intentos por IP (20 por 15 minutos, con Retry-After), protección CSRF y controles de Host y Origin. Tras un proxy inverso, configura MCP_TRUSTED_PROXIES con su IP/subred exacta y haz que sobrescriba X-Forwarded-For. No se confía en cabeceras reenviadas de conexiones directas. La caché elimina sesiones expiradas al consultar o guardar sesiones. El
cambio no añade OAuth al login de Expo: su autenticación existente continúa.

`pnpm --dir mcp test` prueba el protocolo HTTP real contra un dashboard
simulado: consentimiento, PKCE, client/resource/redirect binding, aislamiento de
usuarios, permisos de lectura, persistencia cifrada, rotación, revocación y
stdio.

## Instalar en otra computadora

Requiere Node.js 24 o superior con npm y un cliente compatible con MCP por
stdio. Para usar el dashboard remoto no necesitas clonar el repositorio ni
instalar pnpm. El dashboard debe ser accesible desde esa computadora.

Copia `lasmunecas-mcp-0.2.0.tgz` a la computadora. En PowerShell, instala en una
carpeta propia usando la ruta absoluta del archivo recibido:

```powershell
npm install --prefix C:/MCP/lasmunecas --omit=dev --ignore-scripts C:/Descargas/lasmunecas-mcp-0.2.0.tgz
```

La instalación descarga las dependencias de npm; requiere acceso a internet. El
paquete ya incluye el JavaScript compilado. En macOS o Linux puedes elegir una
carpeta como `$HOME/mcp/lasmunecas` y adaptar las rutas del ejemplo.

Configura tu cliente siguiendo `mcp-config.example.json`: ejecuta `node` con la
ruta absoluta a `C:/MCP/lasmunecas/node_modules/lasmunecas-mcp/dist/index.js`.
Si el cliente no encuentra Node.js, usa la ruta absoluta al ejecutable. El
formato de configuración depende del cliente; el ejemplo usa `mcpServers`.
Reemplaza la URL y las credenciales por las del dashboard que quieres utilizar.
Puedes agregar `MCP_CODIGO` si tu rol exige código del turno.

Reinicia la conexión MCP del cliente y ejecuta `verificar_conexion`. En modo
remoto aparecen 33 herramientas: consultas, solicitudes y cobro. Las operaciones conservan
los permisos del usuario y el cobro requiere confirmación explícita.

Para actualizar, instala el nuevo `.tgz` en la misma carpeta y reinicia la
conexión. Para quitar el paquete:

```powershell
npm uninstall --prefix C:/MCP/lasmunecas lasmunecas-mcp
```

Después elimina la entrada del MCP en tu cliente.

## Preparar una distribución

Desde la raíz del repositorio:

```sh
pnpm --filter lasmunecas-mcp install --frozen-lockfile
pnpm --dir mcp build
pnpm --dir mcp test
```

Desde `mcp`, genera y comprueba el archivo distribuible:

```sh
npm pack --pack-destination releases
npm run test:package -- releases/lasmunecas-mcp-0.2.0.tgz
```

Crea la carpeta `releases` antes de empaquetar si todavía no existe. `prepack`
compila automáticamente; solo se incluyen `dist`, documentación, configuración
de ejemplo y metadatos. El paquete sigue siendo privado y no se publica en un
registro. Al cambiar la versión, adapta el nombre del archivo.

## Errores y reintentos

Cada error sale como JSON parseable en `content` y con el mismo objeto en
`structuredContent.error`:

| Campo | Significado |
| --- | --- |
| `codigo` | Taxonomía del MCP: `CREDENCIALES_INVALIDAS`, `SESION_RECHAZADA`, `PERMISOS_INSUFICIENTES`, `SOLO_ADMINISTRADOR`, `CONEXION_RECHAZADA`, `TIMEOUT`, `ERROR_RED`, `RESPUESTA_INVALIDA`, `ERROR_HTTP`, `OPERACION_RECHAZADA`, `ENTRADA_INVALIDA`, `ERROR_HERRAMIENTA`. |
| `estado` | HTTP del dashboard, o `null` si nunca hubo respuesta. |
| `mensaje` | Detalle legible del fallo. |
| `siguientePaso` | Qué hacer ahora: derivado del `codigo`, y específico cuando el backend responde `IDEMPOTENCY_*`. |
| `codigoNegocio` | `code` del backend cuando lo trae, p. ej. `IDEMPOTENCY_PENDIENTE`. |

`isError` sigue marcando el fallo. El `outputSchema` admite `error` en lugar
de `resultado` porque el cliente MCP también valida el structuredContent de los
errores: sin esa rama, un fallo reventaría con `-32602` en el lado del cliente.
`verificar_conexion` aplica el mismo contrato dentro de su diagnóstico: sus
`ping.error` y `autenticacion.error` también traen `codigo`, `estado`, `mensaje`
y `siguientePaso`.

Sólo las peticiones **GET** reintentan: son idempotentes, mientras que un POST
puede mover dinero. Se reintenta ante `408`, `429`, `5xx`, timeout y fallo de
red, con backoff exponencial `MCP_RETRY_MS * 2^(intento-1)` más jitter, hasta
`MCP_REINTENTOS` intentos. Un `4xx` de negocio no se repite: el backend ya
respondió con una decisión.

## Herramientas de desarrollo

Se desactivan por defecto. Para habilitarlas, configura `MCP_ENABLE_DEV_TOOLS=1`
y `MCP_REPO_ROOT` con la ruta absoluta al repositorio del dashboard, con sus
dependencias instaladas. Aparecerán 37 herramientas. Si falta `MCP_REPO_ROOT`,
el servidor rechaza el arranque en este modo.

Configura el cliente MCP para ejecutar `node` con la ruta absoluta a
`mcp/dist/index.js`. El transporte es stdio; los mensajes de arranque van a
stderr.

Variables de entorno del proceso MCP:

| Variable                    | Uso                                                                                       |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| `MCP_BASE_URL`              | Dirección del dashboard; por defecto `http://127.0.0.1:3000`.                             |
| `MCP_EMAIL`, `MCP_PASSWORD` | Credenciales de un usuario del dashboard. Sus permisos se aplican a las herramientas.     |
| `MCP_CODIGO`                | Código del turno cuando el rol lo requiere.                                               |
| `MCP_TIMEOUT_MS`            | Entero entre 1 y 300000 ms; por defecto 20000. Un valor inválido impide arrancar.                                      |
| `MCP_REINTENTOS`            | Intentos máximos por petición GET; por defecto 3 y `1` los desactiva.                      |
| `MCP_RETRY_MS`              | Espera base del backoff exponencial con jitter; por defecto 250 ms.                       |
| `MCP_REPO_ROOT`             | Ruta absoluta del repositorio; obligatoria cuando se habilitan comandos de desarrollo.    |
| `MCP_ENABLE_DEV_TOOLS`      | `1` habilita comandos de desarrollo y requiere `MCP_REPO_ROOT`; desactivados por defecto. |

Guarda las credenciales en la configuración privada del cliente, sin incluirlas
en el repositorio.

Ejecuta `verificar_conexion` para comprobar ping y autenticación por separado.
Devuelve texto JSON y `structuredContent` con `destino`, `ok`, `ping` y
`autenticacion`. Si alguna comprobación falla, marca `isError: true` y conserva
el resultado de la otra. Los errores incluyen un código, el estado HTTP cuando
existe y un mensaje con el siguiente paso: conexión rechazada, error de red,
timeout, credenciales faltantes o inválidas, código de turno requerido, permisos
insuficientes o respuesta inválida.

Las pruebas usan un backend simulado y comandos en un directorio temporal. No
necesitan credenciales, un dashboard en ejecución ni operaciones de cobro.
Cubren diagnóstico, renovación y rotación de tokens, y resultados de comandos
mediante el protocolo MCP real. Para comprobar el repositorio y la conexión
configurada, ejecuta `node smoke.mjs` desde `mcp`.

## Ranking de asistencia

`ranking_asistencia` consulta todo el historial sin argumentos. Los filtros
opcionales `startDate` y `endDate` usan fechas `YYYY-MM-DD` y límites inclusivos.
Ejemplo: `{ "startDate": "2026-01-01", "endDate": "2026-10-06" }`.
Devuelve todos los usuarios empatados en más asistencias y más faltas.
La jornada es de martes a domingo: cada día laboral sin presencia cuenta como falta.
Cada usuario se evalúa desde su primera marca histórica o `startDate`, la fecha
posterior, hasta `endDate` o ayer en America/La_Paz, la fecha anterior. No cuenta
lunes, jornadas en curso ni fechas futuras. Cada usuario cuenta una sola vez por
fecha y las asistencias pagadas cuentan como presencia. No descuenta permisos ni
vacaciones. Requiere permiso de lectura del módulo attendance.
