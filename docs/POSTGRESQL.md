# PostgreSQL

El backend usa PostgreSQL 18 mediante `pg`. La web y las aplicaciones móviles
consumen la API; no necesitan un controlador SQL propio.

## Configuración

Definir en `.env`: `DB_HOST`, `DB_PORT` (5432), `DB_USER`, `DB_PASSWORD` y
`DB_NAME`. Las credenciales no tienen valores secretos incorporados en el
código. Se conserva `America/Santiago`, la zona horaria del negocio, incluyendo
sus cambios de horario estacional.

Puede utilizarse una instalación local o `docker compose up -d`. No iniciar el
contenedor en el mismo puerto que una instalación local ya activa.

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm db:setup
corepack pnpm db:check
corepack pnpm dev
```

`db:setup` crea la base si falta. Solo importa
`database/lasmunecasderamon.postgres.sql` si la base está vacía; conserva los
datos de una base existente. Luego aplica las migraciones pendientes.

## Esquema y semilla

El volcado base (`database/lasmunecasderamon.postgres.sql`) contiene solo
esquema más una semilla mínima de datos de referencia: roles, permisos y su
matriz, configuraciones, habitaciones, categorías y productos. No contiene datos
personales: el volcado histórico que viajaba con el personal real (nombres,
teléfonos, correos, RUN y hashes de contraseña) fue retirado del repositorio,
junto con el volcado MySQL de origen y su conversor.

La importación crea las tablas y después carga la semilla, los índices y las
relaciones. Valida las claves foráneas sin desactivar los controles
referenciales ni exigir `session_replication_role` de superusuario.

Tras importar hay exactamente un usuario: un admin semilla (`Admin`) con
contraseña inicial `Cambio2026!` y cambio de contraseña obligatorio en la
primera sesión (`force_password_change`). Elegir esa contraseña nueva es el
primer paso de puesta en marcha. El código del local no viaja en el volcado: se
acuña solo en el primer arranque.

Para regenerar el volcado a partir de un dump fresco de la base de referencia
(con datos de referencia actualizados y sin filas operacionales):

```powershell
node scripts/make-schema-only-dump.mjs <dump-origen> database/lasmunecasderamon.postgres.sql
```

## Esquema retirado

`database/legacy/inventario-prerediseno.sql` conserva el DDL del primer módulo
de inventario, anterior al rediseño de `84b61fd`. No forma parte de la
instalación: es el registro histórico de un esquema que se retiró.

Ese diseño usaba los mismos nombres que el actual para
`inventario_presentaciones`, `inventario_unidades` e `inventario_movimientos`,
con otra forma, y la aplicación nunca lo consultó: todo el código filtra por
`current_schema()`, o sea `public`. La migración
`023_eliminar_schema_legacy_inventario.sql` retiró el schema
`legacy_inventario`, que se había creado a mano para poder aplicar `005`–`021`.
Antes de eliminarlo cuenta las filas de sus tablas y aborta si encuentra alguna,
así que no puede borrar datos en silencio; el retiro queda registrado en
`_postgres_migrations`.

Para recuperarlo, solo si alguna vez hiciera falta, hay que crear el schema y
ejecutar el archivo ajustando antes los `CREATE INDEX`, que apuntan a `public`.

## Migraciones

```powershell
corepack pnpm db:migrate
```

El ejecutor registra nombre y SHA-256 en `_postgres_migrations`, utiliza un
bloqueo para evitar ejecuciones simultáneas y confirma cada archivo en una
transacción. Un error aborta con código distinto de cero. Una migración
registrada no vuelve a ejecutarse, y modificar su contenido provoca un error:
las modificaciones posteriores deben agregarse como un archivo nuevo.

Antes de ejecutar, el ejecutor intenta **adoptar** la migración, para que
renombrar o reordenar archivos no implique volver a ejecutar SQL:

- mismo contenido ya registrado bajo otro nombre: es un renombre, se registra
  sin ejecutar nada y se informa el nombre anterior;
- todos los objetos que el archivo declara (tablas, columnas con su tipo,
  índices, secuencias y restricciones) ya están en la base, y el archivo no
  tiene sentencias cuyo efecto no se pueda comprobar: su trabajo ya está hecho,
  se registra sin ejecutar nada.

Cualquier otra combinación se aplica como siempre. Las migraciones de datos
(`INSERT`, `UPDATE`, bloques `DO`) nunca se adoptan por esquema, porque el
esquema no puede confirmar que su trabajo esté hecho.

`db:plan` muestra qué haría cada archivo —aplicar o adoptar, y por qué— sin
escribir nada en la base:

```powershell
corepack pnpm db:plan
```

Incluye índices, columnas pendientes, `push_tokens`, contenido JSON de
respaldos, secuencias de identidad y reconstrucción idempotente del historial de
anticipos. La tabla `_migrations` conserva el historial del ejecutor anterior a
PostgreSQL; las instalaciones nuevas la reciben vacía y el historial vigente
vive en `_postgres_migrations`.

## Verificación de esquema y paridad

El esquema se define en dos lugares: el volcado base
(`database/lasmunecasderamon.postgres.sql`) y la cadena de `migrations/`. Las
dos rutas de instalación —una base nueva y un entorno que ya venía funcionando—
pueden desviarse entre sí, así que hay tres comprobaciones que lo detectan.
Requieren una base de referencia local separada:

```powershell
$env:DB_NAME = 'lasmunecasderamon_test'
corepack pnpm db:setup
corepack pnpm db:verify
corepack pnpm db:diff lasmunecasderamon lasmunecasderamon_test
corepack pnpm db:parity --reference lasmunecasderamon_test --base-ref HEAD
```

`db:verify` construye una base recién creada (importa el volcado y aplica todas
las migraciones) y falla si alguna migración no llega al historial, si un
archivo está vacío o fuera de la convención de nombre, o si el ejecutor no es
idempotente. `db:diff` compara el esquema de dos bases: tablas, columnas, tipos,
valores por defecto, índices y restricciones. `db:parity` instala desde cero por
el camino de producción, reconstruye un entorno existente con el volcado de
`--base-ref` y exige que las dos rutas coincidan con la base de referencia.

Regla que impone ese gate: **si cambias el volcado base, necesitas una migración
que lleve a los entornos existentes al mismo estado, y al revés**. Cambiar solo
el volcado deja a los entornos ya desplegados con un esquema distinto; cambiar
solo las migraciones deja a las instalaciones nuevas con otro. CI ejecuta
`db:verify` en el job `migrations` y `db:parity` en el job `integration`, con
historial completo para poder leer el volcado del commit base.

## Consultas y contratos de la API

Las consultas usan funciones, agrupaciones, JSON y actualizaciones nativas de
PostgreSQL. La interfaz de repositorios conserva los parámetros `?`;
`prepareQuery` los convierte a parámetros PostgreSQL y expande listas `IN (?)`
sin interpolar valores. También admite consultas nativas con `$1`, sin mezclar
estilos.

Se conservan los alias con mayúsculas mediante comillas, los valores numéricos
que espera la API y las fechas de negocio como cadenas. Las concatenaciones
conservan el comportamiento anterior ante NULL. Las transacciones mantienen una
única conexión y revierten todas sus escrituras si fallan. Las escrituras no se
reintentan automáticamente ante una desconexión que podría ocurrir después del
commit.

## Asistencia: desafíos de un solo uso

La presencia se verifica en el servidor con la tabla `asistencia_desafios`
(migración `024`). Reemplaza a `usuarios.qr_token`: esa credencial personal y
estática viajaba en la respuesta de `/api/public/users` — sin autenticación — y
era exactamente lo que aceptaba `POST /api/attendance/register`, de modo que
cualquiera con acceso a internet podía marcar asistencia ajena. La columna quedó
en NULL y comentada como retirada; el esquema y la API ya no la exponen.

El flujo:

1. Una superficie del local emite el desafío: la pantalla de la entrada
   (`POST /api/kiosk/attendance/challenge`, activada por un administrador
   mediante `/api/kiosk/session`) o la pantalla de asistencia del personal con
   permiso de escritura (`POST /api/attendance/qr`).
2. El servidor genera un token aleatorio, guarda **solo su SHA-256**
   (`token_hash`, índice único) y devuelve el valor crudo una vez, para
   dibujarlo como QR. Vence a los 120 segundos.
3. El canje (`POST /api/attendance/register` con ese token como `qrData`) es una
   sentencia atómica
   `UPDATE ... WHERE usado_en IS NULL AND expira_en > now() AND (usuario_id = ? OR emisor_usuario_id = ?)`:
   un token no se usa dos veces, no acredita a otra persona, y solo lo canjea su
   dueño o quien lo emitió desde el mostrador. La columna `emitido_por` registra
   la superficie emisora.

Hay un solo desafío activo por persona: emitir uno nuevo invalida el anterior.
Los desafíos vencidos se descartan al canjearlos o al emitir el siguiente. El
código de 4 dígitos del local sigue funcionando como segunda vía: acredita a
quien tiene la sesión abierta y rota en cada uso.

`lib/kiosk/attendanceChallenges.ts` contiene el ciclo de vida completo y
`lib/kiosk/deviceAuth.ts` la credencial de la pantalla (cookie `kiosk_token`
aleatoria, guardada como SHA-256 en `kiosk_devices`). La migracion
`026_kiosk_devices.sql` crea el registro de pantallas. En Ajustes > Asistencia,
el administrador activa este navegador y se cierra su sesion personal. La
credencial se renueva con la pantalla abierta y se puede revocar desde ajustes.
Tras 30 dias sin uso o al borrar cookies, se requiere activar de nuevo. No
requiere variables de entorno ni copiar codigos. Las pruebas están en
`tests/postgres/attendance-challenges.test.ts` y `tests/unit/lib/kiosk/`.

## Respaldos y restauración

Los respaldos JSON de la aplicación utilizan una lectura consistente e incluyen
las tablas vacías. La restauración valida tablas y columnas, usa una transacción
y verifica las relaciones antes del commit. Un error no produce una restauración
parcial. La limpieza emplea un único TRUNCATE con RESTRICT y conserva las tablas
protegidas y los historiales de migración.

Las credenciales, usuarios, roles, permisos y configuración están excluidos de
los respaldos JSON operativos. Para un respaldo completo de infraestructura,
utilizar las herramientas de PostgreSQL:

```powershell
pg_dump -h 127.0.0.1 -p 5432 -U postgres -d lasmunecasderamon -Fc -f respaldo.dump
createdb -h 127.0.0.1 -p 5432 -U postgres lasmunecas_recuperacion
pg_restore -h 127.0.0.1 -p 5432 -U postgres -d lasmunecas_recuperacion --no-owner --exit-on-error respaldo.dump
```

La restauración de infraestructura se realiza primero en una base separada para
comprobarla antes de cambiar la configuración de la aplicación.

## Pruebas

Las pruebas PostgreSQL e integración apuntan a la base local `lasmunecasderamon`
(`DB_HOST` debe ser loopback). Escriben datos; la mayoría de los flujos usa
snapshot/restauración, que reescribe temporalmente las tablas no protegidas.
Ejecútalas cuando no haya otros usuarios ni procesos usando esa base.

```powershell
$env:DB_NAME = 'lasmunecasderamon'
corepack pnpm test:postgres
corepack pnpm test:integration:all
corepack pnpm test:unit
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
```

`test:postgres` utiliza los repositorios reales, verifica los contratos de
tipos, rollback, parámetros, respaldo/restauración y el flujo pedido → venta →
caja. Además, PostgreSQL planifica más de 400 sentencias estáticas mediante
EXPLAIN, sin ejecutarlas. `test:integration:all` conserva los 33 archivos de
pruebas heredadas y los 9 flujos, ahora sobre PostgreSQL. CI utiliza
PostgreSQL 18.

Referencias de implementación:
[tipos de node-postgres](https://node-postgres.com/features/types),
[restricciones diferibles](https://www.postgresql.org/docs/current/sql-set-constraints.html),
[TRUNCATE y RESTRICT](https://www.postgresql.org/docs/current/sql-truncate.html).
