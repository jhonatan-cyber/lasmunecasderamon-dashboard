# Benchmark HTTP del dashboard

`pnpm benchmark:dashboard:api` mide por HTTP y **una ruta a la vez** las seis
rutas principales que alimentan el dashboard: `GET /api/dashboard/composite`,
`GET /api/stats/dashboard-summary`, las tendencias `sales-by-month` y
`sales-by-week`, `GET /api/stats/logged-users` y `GET /api/cash-register/stats`.
Por ruta informa p50/p95, mínimo/máximo, throughput y estado `HIT`/`MISS` en
cuatro fases: caché frío secuencial (concurrencia 1), caché caliente secuencial,
ráfagas frías concurrentes y carga concurrente con caché caliente. También
reporta medianas/p95 de autenticación y permisos, handler, normalización de
respuesta y operaciones Redis; además desglosa autenticación en extracción de
token, verificación JWT, vigencia de sesión y lectura de permisos. En las fases
secuenciales informa por separado el número/tiempo acumulado de consultas
PostgreSQL de autenticación y del handler, además del tiempo de conexión; el
cuerpo de respuesta se valida, pero nunca se imprime. También informa el tiempo
interno de `EXPLAIN ANALYZE` y el viaje de ida y vuelta del mismo `SELECT` de
sesión desde el proceso del benchmark, para distinguir ejecución SQL de espera
del cliente o red.

El benchmark requiere Next.js **en modo desarrollo** escuchando en
`127.0.0.1:3000`, Redis local y una sesión vigente en la base configurada con
permisos para las seis rutas. PostgreSQL es local por defecto; para apuntar a
una base remota, configura `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` y
`DB_NAME` y habilita explícitamente `DASHBOARD_API_BENCHMARK_ALLOW_REMOTE_DB=1`.
La concurrencia máxima permitida con PostgreSQL remoto es 4. El benchmark
invalida el caché Redis durante las fases frías, así que Redis remoto se rechaza
para no afectar un servicio compartido. Si la base remota se alcanza mediante un
túnel con `DB_HOST` loopback, mantén también el opt-in para aplicar el límite.

Firma en memoria un token temporal usando la sesión encontrada; no crea
sesiones, realiza operaciones de negocio ni guarda el token. Las rutas medidas
son `GET` y las consultas de diagnóstico son de lectura, aunque consumen
recursos en la base remota. Ejecuta el benchmark solo contra una base autorizada
y con carga baja. Las métricas `Server-Timing` se activan solo con la cabecera
interna `X-LMR-Profile: 1` en entornos no productivos; no se exponen en
producción. Las IP de loopback varían para evitar que el rate limiter agrupe la
carga bajo un único cliente.

Valores iniciales por ruta: concurrencia 4, 3 muestras frías y 6 calientes en
cada una de las fases secuencial y concurrente. Se pueden ajustar con
`DASHBOARD_API_BENCHMARK_CONCURRENCY` (1–20 con PostgreSQL local; 1–4 con
remoto), `DASHBOARD_API_BENCHMARK_COLD_BATCHES` (1–10) y
`DASHBOARD_API_BENCHMARK_WARM_BATCHES` (1–10), con un máximo combinado de 10
iteraciones. Las peticiones se hacen a una sola ruta por ola; como máximo se
ejecutan 20 simultáneas con PostgreSQL local. Para seleccionar otro servidor de
desarrollo local se puede configurar `DASHBOARD_API_BENCHMARK_BASE_URL`; se
rechazan URLs no loopback y Redis remoto.

La latencia total incluye red local, proxy de Next, autenticación, permisos,
handler y respuesta. El perfil PostgreSQL existente usa acumuladores globales
del proceso, por lo que se lee solo en las fases secuenciales (`?perfil=1`);
para atribuir sus consultas correctamente, evita tráfico concurrente de otras
personas durante esa parte. Antes de medir, hace una petición no contabilizada a
cada ruta para calentar el proceso y evitar mezclar compilación on-demand;
“frío” significa caché Redis local invalidada con el proceso caliente. Cada
muestra fría rota la generación completa del caché, por lo que conviene ejecutar
el benchmark cuando nadie más use ese Redis. No es una carga distribuida ni
sustituye pruebas de concurrencia de producción; los resultados no definen
umbrales de CI y deben repetirse en condiciones comparables.

Si una etapa `Server-Timing` requerida no aparece, el benchmark falla para no
mezclar resultados de un servidor desactualizado o ejecutado en producción.
Reinicia Next.js en desarrollo con el código actual y vuelve a correrlo.
