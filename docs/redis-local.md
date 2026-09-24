# Redis local

`pnpm dev` (también `dev:lan:auto` y `dev:warmup`) comprueba Redis antes de
iniciar Next.js. En Windows, si `REDIS_WSL_DISTRO=Ubuntu`, inicia el servicio
`redis-server` de esa distribución y mantiene WSL activo durante la sesión.
Requiere que Ubuntu y Redis ya estén instalados. No instala paquetes ni pide
permisos de administrador de Windows.

```dotenv
REDIS_URL=redis://127.0.0.1:6379
REDIS_WSL_DISTRO=Ubuntu
```

Para Docker, Redis nativo o servidores remotos, dejar `REDIS_WSL_DISTRO` vacío.
El arranque de WSL solo aplica a Redis local, sin credenciales y en el
puerto 6379. Linux/macOS y destinos remotos solo se comprueban: administrar allí
el servicio con las herramientas de su plataforma.

- `pnpm redis:check`: verifica PING sin iniciar servicios.
- `pnpm redis:start`: inicia y mantiene WSL activo; dejar esta terminal abierta
  cuando se use `dev:mobile`, `dev:lan` o `pnpm start`. Ctrl+C libera el proceso
  que mantiene WSL activo; no detiene el servicio Redis compartido.
- `pnpm test:redis`: prueba el limitador contra Redis local en 127.0.0.1:6379.
  Usa claves temporales propias y un relay TCP para simular cortes, sin detener
  el Redis compartido ni borrar datos ajenos.

El limitador se aplica en producción (`NODE_ENV=production`), salvo que
`SKIP_RATE_LIMIT=true`. En desarrollo sigue desactivado. Tras un fallo usa
memoria por proceso y permite otro intento de conexión después de 5 segundos,
cuando llegue una solicitud. Las solicitudes concurrentes comparten conexión.
Los contadores en memoria y Redis son independientes: al cambiar de respaldo
puede existir un margen adicional de solicitudes; no son límites globales
estrictos durante una caída.

## Caché del dashboard

Dashboard compuesto, resumen por usuario/rol, ventas por semana/mes y usuarios
conectados comparten caché Redis con TTL de 15–30 segundos. También se cachean
los stats operativos de caja (`/api/caja/stats` y `/api/cashregister/status`
comparten la entrada `STATS`), las ventas por mes de `/api/sales/stats` y las
ventas por categoría de `/api/caja/ventas-barras|champagne|tragos-chicas` (una
clave por caja y tipo). El namespace incluye un hash del host, puerto y nombre
de PostgreSQL para separar bases de datos. Las respuestas llevan
`X-Cache: HIT/MISS` y `Cache-Control: private, no-store`: el navegador siempre
consulta al servidor y no conserva otra copia obsoleta.

`query`, `rawQuery` y `withTransaction` invalidan la generación después de
escrituras confirmadas; una transacción invalida una sola vez tras COMMIT y
libera antes la conexión PostgreSQL. ROLLBACK no invalida. Una consulta que
empezó antes de invalidar puede completar su respuesta, pero no vuelve a poblar
la generación vigente con datos anteriores. Las escrituras directas externas
(scripts SQL, otros sistemas) quedan sujetas al TTL.

Si Redis falla, se consulta PostgreSQL directamente, sin copia en memoria que
pueda perder invalidaciones entre procesos. El cliente reintenta tras 5 segundos
y cambia la generación al recuperarse. Durante fallos parciales de red, otros
procesos que aún accedan a Redis pueden ver entradas hasta su TTL (máximo 30s).
Los fallos de caché no convierten una escritura confirmada en un error de
negocio.

`pnpm test:redis` también verifica caché compartida, TTL, aislamiento,
invalidación concurrente y recuperación. `pnpm benchmark:dashboard` mide las
consultas locales y lecturas Redis sin modificar PostgreSQL ni mostrar datos de
negocio. Rechaza hosts PostgreSQL remotos y usa Redis en 127.0.0.1:6379 con
claves temporales propias. Requiere `.env` y ambos servicios activos.

Medición local del 24/09/2026 (3 iteraciones, milisegundos):

| Consulta            | MISS (consulta + escritura de caché) | HIT Redis          |
| ------------------- | ------------------------------------ | ------------------ |
| Dashboard compuesto | 307,30 / 21,05 / 16,94               | 1,14 / 0,88 / 0,75 |
| Ventas por mes      | 3,78 / 2,80 / 2,66                   | 0,79 / 1,06 / 0,95 |
| Ventas por semana   | 7,58 / 4,90 / 4,48                   | 0,91 / 0,83 / 0,88 |
| Usuarios conectados | 3,96 / 3,35 / 3,24                   | 1,14 / 0,75 / 0,73 |

La primera consulta incluye calentamiento del pool. No son mediciones HTTP, no
incluyen autenticación ni renderizado y no comparan Redis con la caché en
memoria anterior. Redis aporta aquí también invalidación entre procesos.

## Caché de permisos

Los permisos por usuario se guardan en Redis con TTL de 60 s, además de una
copia en memoria por proceso. Mientras Redis responde, la lectura es compartida:
un proceso reutiliza lo que cacheó otro. La copia en memoria solo se usa como
respaldo cuando Redis no está disponible, y luego se descarta al reconectar.

Al cambiar el rol o desactivar un usuario se borra su entrada compartida, así
que los demás procesos la vuelven a resolver en el siguiente request. El
endpoint `POST /api/permissions/invalidate-cache` rota la generación completa:
todos los procesos descartan su copia local y releen de Redis. Una escritura
calculada antes de esa rotación no vuelve a poblar la generación vigente.

Si Redis falla, los permisos se sirven desde memoria durante la caída (por
proceso, hasta 60 s) y al recuperarse se rota la generación para descartar datos
obsoletos. `pnpm test:redis` verifica que dos procesos comparten la caché y que
la invalidación por usuario y global se propaga entre ellos.

## Eventos SSE entre instancias

Cuando un proceso atiende al menos un cliente SSE y `REDIS_URL` está
configurado, se suscribe a un canal Redis compartido. `sendNotificationToAll`
entrega el evento de inmediato a sus clientes locales y lo publica para el
resto: cada instancia reparte lo recibido aplicando el catálogo de
`lib/api/sseEvents.ts`, así que la audiencia (personal, rol, usuario o pantalla
del local) se respeta en todas.

El emisor identifica sus mensajes y no los reprocesa, por lo que un evento nunca
llega dos veces al mismo cliente. Sin `REDIS_URL` el bus queda desactivado y
todo funciona como antes, en una sola instancia, sin abrir conexiones
persistentes. Si Redis falla, la entrega local sigue funcionando y la reconexión
se reintenta cada 5 segundos. `pnpm test:redis` verifica la publicación en el
canal y la recepción de eventos emitidos por otra instancia.

## Bloqueo por intentos fallidos de login

El contador de intentos fallidos se guarda en Redis con ventana de 15 minutos,
umbral de 5 intentos y bloqueo de 15 minutos. Al alcanzar el umbral la cuenta
queda bloqueada para todas las instancias, y el contador arranca de cero cuando
expira el bloqueo. El identificador se normaliza (sin espacios y en minúsculas)
y se hashea antes de usarlo como clave: la misma cuenta no se puede evadir con
otra combinación de mayúsculas ni repartiendo los intentos entre servidores.

Si Redis no responde, cada proceso cuenta con su propia copia en memoria (el
comportamiento anterior) y un bloqueo que el proceso ya observó se conserva
local mientras dure, aunque Redis caiga justo después. Al recuperarse, la fuente
de verdad vuelve a ser el contador compartido y el conteo local acumulado
durante la caída no se suma, igual que en el limitador. El bloqueo ya no se
pierde al reiniciar un proceso ni se multiplica por el número de instancias.
`pnpm test:redis` verifica el bloqueo compartido entre instancias, su TTL, la
liberación al expirar y el respaldo en memoria.

## Conteo de anulaciones masivas

Las anulaciones por usuario se cuentan en una ventana de 5 minutos, con el mismo
umbral que antes: la segunda dispara la alerta preventiva y la tercera la
crítica. El contador ahora es compartido, así que el umbral ya no se multiplica
por el número de instancias ni se pierde al reiniciar un proceso. Los códigos de
los documentos anulados se guardan junto al contador con el mismo TTL, de modo
que la alerta siga mostrando todo lo involucrado aunque cada anulación la haya
atendido una instancia distinta. Al alcanzar el umbral el contador se limpia
para todas las instancias: la siguiente anulación abre una ventana nueva en
lugar de repetir la alerta.

Si Redis falla, cada proceso cuenta con su propia copia en memoria y su propia
lista; al recuperarse vuelve a mandar el contador compartido. `pnpm test:redis`
verifica el conteo compartido, el TTL de ambas claves, el arranque de cero al
expirar la ventana y el respaldo en memoria.
