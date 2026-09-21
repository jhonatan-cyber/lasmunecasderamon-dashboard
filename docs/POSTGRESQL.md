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
`db:import` es un alias con el mismo comportamiento conservador; no reemplaza
una base existente.

## Esquema y datos de origen

El archivo `database/lasmunecasderamon.sql` conserva el volcado de origen. Para
regenerar su versión PostgreSQL:

```powershell
node scripts/mysql-to-postgres.mjs
```

La importación crea tablas, carga los datos y después crea índices y relaciones.
Valida las claves foráneas sin desactivar los controles referenciales ni exigir
`session_replication_role` de superusuario.

Las tres fechas de creación `0000-00-00 00:00:00` del volcado se convierten a
`1970-01-01 00:00:00`, el mismo marcador de fecha desconocida que ya tenía la
base PostgreSQL local. El volcado original conserva los valores originales y el
conversor informa la normalización. El conversor conserva los valores de los
ENUM mediante restricciones CHECK y corrige los tipos de identificadores
documentados en su código.

## Migraciones

```powershell
corepack pnpm db:migrate
```

El ejecutor registra nombre y SHA-256 en `_postgres_migrations`, utiliza un
bloqueo para evitar ejecuciones simultáneas y confirma cada archivo en una
transacción. Un error aborta con código distinto de cero. Una migración
registrada no vuelve a ejecutarse, y modificar su contenido provoca un error:
las modificaciones posteriores deben agregarse como un archivo nuevo.

Incluye índices, columnas pendientes, `push_tokens`, contenido JSON de
respaldos, secuencias de identidad y reconstrucción idempotente del historial de
anticipos. `_migrations` se conserva como historial de la base anterior.

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

Las pruebas de integración escriben datos. Requieren una base local cuyo nombre
termine en `_test`; nunca usar la base operativa.

```powershell
$env:DB_NAME = 'lasmunecasderamon_test'
corepack pnpm db:setup
corepack pnpm test:postgres
corepack pnpm test:integration:all
Remove-Item Env:DB_NAME
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
