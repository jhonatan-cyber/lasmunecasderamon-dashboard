# Auditoría: superficie de escritura y regla de sincronización offline

**Fecha:** 2026-11-06 **Alcance:** `lasmunecasderamon-dashboard` (API) +
`lasmunecasderamon-app` (outbox). **Pregunta que responde:** si el local pasa a
ser la autoridad durante un corte de internet y la VPS vuelve como autoridad al
reconectar, ¿qué endpoints escriben, sobre qué tablas, y con qué regla de
sincronización cada uno?

---

## 0. Resumen ejecutivo

1. **La idempotencia ya está resuelta de forma universal.** Todo handler mutante
   autenticado pasa por `withRoute` → `runRegistration` → `runIdempotent`, que
   deduplica contra la tabla `sync_operations` con la clave del cliente. No hay
   que inventar ese mecanismo: hay que **usarlo**, no escribirlo.
2. **La app ya encola offline 4 tipos de escritura** (pedido, venta, consumos de
   cuenta, cobro de cuenta) con `x-idempotency-key`. Es el 100% de lo que hoy se
   registra sin red.
3. **El resto (~160 handlers) no está encolado offline**: catálogo, identidad,
   configuración, dinero irreversible (cierres, retiros, nómina), telemetría y
   biometría. La mayoría **no debería** encolarse: o son de la VPS, o son
   derivados, o necesitan revisión humana.
4. **Los estados que no se pueden fusionar son pocos y están localizados**:
   dinero (cajas, retiros, nómina, aprobaciones), secuencias `SERIAL/IDENTITY` y
   claves únicas naturales (DNI, `ventas.entrada_id`).
5. **Riesgo estructural no cubierto por la sync**: las fotos (productos,
   usuarios, bauchers) viven en el **filesystem local** (`public/img/**`), no en
   un bucket. El filesystem también es estado, y hoy no se replica.

**Veredicto:** el proyecto es viable como lo imaginás, pero **no** con un modelo
simétrico "ambas DB son principales". Es soportable con **traspaso explícito de
autoridad + ventana de corte**, y con una regla distinta por clase de dato (§4).

---

## 1. Alcance y método

| Métrica                                           | Valor                                                                 |
| ------------------------------------------------- | --------------------------------------------------------------------- |
| Handlers exportados (`GET/POST/PUT/PATCH/DELETE`) | **316** en **215** archivos `app/api/**/route.ts`                     |
| Handlers **mutantes** (`POST/PUT/PATCH/DELETE`)   | **166** en **123** archivos                                           |
| Migraciones                                       | 113 (`001_consolidated.sql` … `113_entradas_acompanamiento_json.sql`) |
| Tablas base (dump autoritativo)                   | 59 en `database/lasmunecasderamon.postgres.sql`                       |
| Tablas agregadas por migración posterior          | ~20 más (060–113)                                                     |

**Cómo se relevó** (reproducible):

```bash
# patrón real de export de los handlers
rg -n "^export const (GET|POST|PUT|PATCH|DELETE)" app/api
# solo mutantes
rg -l "^export const (POST|PUT|PATCH|DELETE)" app/api
# tablas base
rg "^CREATE TABLE" database/lasmunecasderamon.postgres.sql
```

Nota: el primer intento con `^export (async )?function (GET|POST|...)` devolvía
solo 20 coincidencias y era un **subconteo**: los handlers no se declaran con
`function`, se declaran con `export const X = withRoute(...)`.

---

## 2. Lo que ya existe (no hay que inventarlo)

### 2.1 Idempotencia universal: `withRoute` → `runRegistration` → `runIdempotent`

`lib/api/withRoute.ts` es un envoltorio único por el que pasan todas las rutas.
Además de auth, permisos y auditoría, cuando hay usuario y el método es mutante
llama a `runRegistration` (`lib/api/registration.ts`):

- Lee el header **`x-registration-key`** (`REGISTRATION_HEADER`).
- Deriva un `scope` estable: `web.{METHOD}.{sha256(METHOD path query)}`.
- Delega en `runIdempotent` (`lib/api/idempotency.ts`) con la clave del cliente.

`runIdempotent` reclama la clave en `sync_operations` con
`INSERT ... ON CONFLICT (id_cliente) DO NOTHING` (atómico) y resuelve así:

| Estado guardado  | Respuesta al reintento                                    |
| ---------------- | --------------------------------------------------------- |
| (no existe fila) | ejecuta el handler                                        |
| `aplicada`       | replica la respuesta guardada (2xx)                       |
| `rechazada`      | replica la respuesta guardada (4xx)                       |
| `pendiente`      | **409** `IDEMPOTENCY_PENDIENTE` (en curso o huérfana)     |
| `fallida`        | **409** `IDEMPOTENCY_FALLIDA` (5xx: no se sabe si aplicó) |

**Consecuencia para la sync:** cualquier reintento tras una caída de red es
seguro en todas las rutas mutantes autenticadas, aunque el handler no sepa nada
de offline. El subconjunto que además declara un `endpoint` semántico es el que
la app usa explícitamente (§2.2).

### 2.2 Rutas con idempotencia semántica explícita (`runIdempotent` con nombre)

| Ruta                                             | Endpoint lógico    |
| ------------------------------------------------ | ------------------ |
| `POST /api/orders`                               | `orders.create`    |
| `POST /api/sales`                                | `sales.create`     |
| `PUT /api/accounts/[id]`                         | consumos de cuenta |
| `POST /api/accounts/[id]/charge`                 | cobro de cuenta    |
| `POST /api/accounts/[id]/charge-with-sale`       | cobro con venta    |
| `POST /api/services` y `/api/services/temporary` | alta de servicio   |
| `POST /api/tickets`                              | `entradas.create`  |
| `POST /api/cleaning`                             | limpieza           |

### 2.3 Outbox de la app (lo que hoy se encola sin red)

`lasmunecasderamon-app/services/outbox/service.ts` — `INTENT_SENDERS`:

| Intención              | Método y ruta                          | Header                         |
| ---------------------- | -------------------------------------- | ------------------------------ |
| `order.create`         | `POST /orders`                         | `x-idempotency-key: intent.id` |
| `sale.create`          | `POST /sales`                          | `x-idempotency-key: intent.id` |
| `account.consumptions` | `PUT /accounts/{id}`                   | `x-idempotency-key: intent.id` |
| `account.checkout`     | `POST /accounts/{id}/charge-with-sale` | `x-idempotency-key: intent.id` |

Detalles que ya resuelven problemas de la sync:

- `orderFlushable` ordena **consumos antes que cobro** para la misma cuenta.
- `checkoutBlocked` bloquea el cobro mientras haya consumos sin resolver de esa
  cuenta (evita cobrar algo que todavía no llegó).
- `MAX_OUTBOX_ATTEMPTS = 6`, backoff exponencial, tope 60 s.
- `stampDeviceDate` inyecta `device_date` en el payload; el servidor lo usa
  (`getNowInBusinessTimezone`) para no depender del reloj del server.
- Hay hook `reconcile` que consulta al servidor antes de reintentar.
- `isRetryableError`: red/timeout reintentan; 4xx y `UnauthorizedError` no.

### 2.4 El ledger `sync_operations`

`migrations/040_sync_operations.sql` + `lib/database/sync-operations.ts`.
`id_cliente varchar(64) PK`, `usuario_id`, `endpoint`, `estado`, `respuesta`,
`intentos`, `creado_en`, `aplicado_en`. Panel de revisión:
`SyncOperationRepository.getPendientes()` (estados `pendiente` y `fallida`).

> Comentario textual de la migración: _"pedidos.codigo existe desde antes y es
> único por convención, pero no tiene constraint: nada impide dos filas con el
> mismo código"_. Es la primera grieta concreta del modelo (§5.2).

---

## 3. Superficie de escritura, agrupada por tabla

Leyenda de clase:

- **OP** = operativo → se genera en el local, debe poder aplicarse sin internet.
- **MA** = maestro → catálogo/config/identidad; se sirve por lectura al local,
  se edita en la autoridad.
- **DI** = dinero irreversible → no se fusiona automáticamente; conflicto →
  humano.
- **EF** = efímero/derivado → no se sincroniza.
- **EX** = externo → depende de internet o de hardware local.
- **ME** = meta → nunca se replica.

### 3.1 Identidad y acceso — MA

| Endpoints                                                                                                      | Tablas                            |
| -------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `auth/login`, `logout`, `refresh`, `reset-password`, `change-password`, `register-first-user`                  | `codigos`, `logins`, `usuarios`   |
| `users` POST/PATCH, `users/[id]` PUT/DELETE                                                                    | `usuarios`                        |
| `hostesses/[id]/status` PATCH                                                                                  | `usuarios`                        |
| `roles` POST, `roles/[id]` PUT/DELETE, `roles/[id]/permissions` PUT, `roles/setup`                             | `roles`, `role_permissions`       |
| `permissions` POST, `permissions/[id]` PUT/DELETE, `permissions/setup-cashier`, `permissions/invalidate-cache` | `permissions`, `role_permissions` |

**Regla:** MA. El local necesita **leer** usuarios/roles/permisos para
autenticar y autorizar durante el corte, pero no editarlos. Si se crea un
usuario durante el corte, es conflicto (PK `usuarios.id` + único natural:
email/DNI).

### 3.2 Catálogo e inventario — mixto MA / OP

| Endpoints                                                                                                                                                                                                                      | Tablas                                                                                      | Clase                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- | --------------------- |
| `products` POST/PUT/PATCH/DELETE, `products/[id]` PUT/DELETE, `products/reorder`, `products/[id]/tiers`, `products/units` POST/PATCH, `products/units/printed`, `products/presentations` POST/PATCH/DELETE, `products/expired` | `productos`, `inventario_presentaciones`, `inventario_unidades`, `producto_champagne_tiers` | **MA** (alta/edición) |
| `categories` POST/PATCH/PUT/DELETE, `categories/[id]`, `categories/reorder`                                                                                                                                                    | `categorias`                                                                                | **MA**                |
| `bar` POST, `bar/reorder`, `bar/containers` POST, `bar/containers/confirm`                                                                                                                                                     | `inventario_movimientos`, stock de bar                                                      | **OP**                |
| `purchases` POST                                                                                                                                                                                                               | `compras`, `detalle_compras`, `inventario_movimientos`                                      | **OP/DI**             |
| `transfers` POST, `transfers/[id]/accept`                                                                                                                                                                                      | `inventario_movimientos` (transferencias 012/027/028)                                       | **OP/DI**             |
| `cleaning` POST                                                                                                                                                                                                                | `limpieza_articulos`, `limpieza_stock`, `limpieza_movimientos`                              | **OP**                |
| `products/reorder`, `categories/reorder`, `bar/reorder`, `rooms/reorder`                                                                                                                                                       | columnas `orden`                                                                            | **MA**                |

**Regla:** el **catálogo** (qué producto existe, cuánto cuesta, qué
presentación) es MA y se replica local en solo-lectura. El **movimiento de
stock** (cuánto queda, traslados, mermas) es OP y **sí** debe aplicarse en el
local: si no, se vende lo que no hay o se bloquea la venta. Aquí está el primer
conflicto real: **stock negativo** (§5.3).

### 3.3 Operación en salón — OP (núcleo del modo offline)

| Endpoints                                                                                                                   | Tablas                                                      |
| --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `orders` POST, `orders/[id]` PUT/DELETE, `orders/check-active-room`                                                         | `pedidos`, `detalle_pedidos`, `pedidos_usuarios`            |
| `accounts` POST, `accounts/[id]` PUT/DELETE, `accounts/[id]/charge`, `accounts/[id]/charge-with-sale`, `accounts/[id]/stop` | `cuentas`, `detalle_cuentas`, `cuentas_usuarios`            |
| `sales` POST, `sales/[id]` PATCH/DELETE                                                                                     | `ventas`, `detalle_ventas`, `ventas_usuarios`, `venta_logs` |
| `services` POST, `services/[id]` PUT/PATCH/DELETE, `services/[id]/hostesses` PATCH, `services/temporary`                    | `servicios`, `detalle_servicios`, `servicio_logs`           |
| `service-requests` POST/DELETE, `service-requests/[id]/approve                                                              | reject`                                                     | `solicitudes_atencion` |
| `tickets` POST, `tickets/[id]/entregar`, `tickets/[id]/anular`                                                              | `entradas_clientes`, `entradas_clientes_productos`          |
| `meals` POST                                                                                                                | `colaciones`                                                |
| `rooms` POST/PUT/PATCH/DELETE, `rooms/[id]` PUT/PATCH/DELETE                                                                | `habitaciones`                                              |
| `quinchos` POST, `quinchos/[id]` DELETE                                                                                     | `reservas_quincho`                                          |
| `attendance` POST, `attendance/register`, `attendance/qr`, `attendance/bulk`                                                | `asistencias`, `asistencia_desafios`                        |
| `advances` POST, `advances/[id]` PUT, `advances/requests`                                                                   | `anticipos`, `solicitudes_anticipos`                        |
| `clients` POST/PUT/DELETE, `clients/[id]` PUT/DELETE, `clients/prepaid`, `clients/return`                                   | `clientes`, `clientes_prepago_movimientos`                  |

**Regla:** OP. Es donde ya está probado el patrón (pedido/venta/consumo/cobro) y
donde **no** hay que cambiar nada del diseño actual.

### 3.4 Dinero y aprobaciones — DI

| Endpoints                                                                                                                                                                                         | Tablas                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `cashregister` POST/PUT/PATCH, `cashregister/[id]` DELETE, `cashregister/withdrawals`                                                                                                             | `cajas`, `retiros_caja`                               |
| `cashregister/closing`, `closing/resend`, `closing-request`, `process-closing`                                                                                                                    | `solicitudes_cierre_caja`, `cajas`                    |
| `payroll` POST                                                                                                                                                                                    | `pagos_nomina`                                        |
| `advances/approve` PUT                                                                                                                                                                            | `solicitudes_anticipos`, `anticipo_historial`         |
| `gratifications/approve` PUT, `gratifications` POST, `gratifications/[id]` PUT/DELETE                                                                                                             | `gratificaciones`                                     |
| `commissions` POST, `commissions/[id]` PUT/DELETE                                                                                                                                                 | `comisiones`, `detalle_comisiones`                    |
| `tips` POST, `tips/[id]` DELETE                                                                                                                                                                   | `propinas`, `detalle_propinas`                        |
| `overtime` POST                                                                                                                                                                                   | `horas_extras`                                        |
| `clients/return/approve`, `clients/return/reminder`                                                                                                                                               | `devoluciones_ventas`, `solicitudes_devolucion_saldo` |
| `accounts/cancellation`, `accounts/process-cancellation`, `sales/cancellation`, `sales/process-cancellation`, `services/cancellation`, `services/process-cancellation` (+ `cancellation-request`) | `solicitudes_anulacion_*`                             |

**Regla:** DI. Un cierre de caja, un pago de nómina o una aprobación **no se
fusionan**: son hechos con número, no conjuntos. Si ocurren en ambos lados
durante el corte, hay que **elegir cuál vale** (o reflejar ambos como dos hechos
distintos), y eso es decisión humana. Nunca automático.

### 3.5 Configuración, respaldos y meta — MA / ME

| Endpoints                                                   | Tablas            | Clase  |
| ----------------------------------------------------------- | ----------------- | ------ |
| `configurations` PUT, `settings/presence` POST              | `configuraciones` | **MA** |
| `settings/backup` POST, `settings/backup/[id]/restore` POST | `backups`         | **ME** |
| `settings/database-clean` POST                              | varias            | **ME** |
| `sync-operations` GET                                       | `sync_operations` | **ME** |
| `_migrations`, `query_logs`                                 | —                 | **ME** |

**Regla:** MA/ME. `configuraciones` se replica al local en lectura (precios,
umbrales, `costo_entrada`). Los respaldos y el `database-clean` **solo** en la
autoridad.

### 3.6 Telemetría y efímeros — EF

`notifications` POST/PATCH, `notifications/assistance(/accept)`, `error-logs`
POST, `ping` POST, `reviews` POST, `csp-violation`.

`reviews` POST **no escribe en base**: arma una URL de WhatsApp
(`app/api/reviews/route.ts`). No cuenta como escritura para la sync.

**Regla:** EF. No se sincroniza; se regenera o se pierde sin impacto contable.

### 3.7 Externo / hardware — EX

`whatsapp/test`, `whatsapp/webhook`, `cashregister/[id]/whatsapp`, `biometric/*`
(devices, reception, records/poll, credentials, discover, resync, poller),
`biometrico/identificar`, `users/[id]/biometric/*`, `kiosk/*`, `mcp/admin/*`.

**Regla:** EX. Nativo DVR/Kiosco y Twilio/WhatsApp requieren internet o la LAN
del hardware. Los datos que producen (`biometric_events`, `asistencias`) son OP
una vez que llegan al servidor local.

---

## 4. Reglas de sincronización propuestas

Seis reglas, una por clase. La regla no es "por endpoint" sino **por tabla**,
con las excepciones marcadas.

### R1 — Operativo (OP): store-and-forward idempotente

- La escritura se aplica **en el nodo local** (autoridad durante el corte).
- Se encola con `x-idempotency-key` (de app) o `x-registration-key` (de
  dashboard).
- Al volver internet, se **replica unidireccional local → VPS**.
- El reintento es seguro por `sync_operations` (ya existe).
- **No hay merge**: la fila la crea un solo autor; la réplica es un `UPSERT` por
  PK.

### R2 — Maestro (MA): réplica de solo-lectura hacia el local

- La autoridad de escritura es la VPS (o el local, si el corte es largo).
- El local mantiene una **copia de lectura** para operar: productos, precios,
  categorías, usuarios, roles, permisos, configuraciones.
- **Prohibido** editar MA durante el corte. Si se necesita (p. ej. un producto
  nuevo), se encola como **operación de excepción** y se aplica al reconectar,
  con conflicto → humano si el registro ya existe.

### R3 — Dinero irreversible (DI): sin fusión automática

- Se registra en la autoridad vigente.
- Al reconectar, **no se reintenta ni se fusiona**: se presenta como conflicto.
- Cierres de caja y retiros usan el mismo criterio que ya aplica la app: bloqueo
  si hay consumos sin resolver (`checkoutBlocked`).
- **Corolario:** dos cierres de caja para el mismo turno en dos nodos es un
  conflicto de negocio, no de red. Requiere una decisión (ventana de cierre,
  turno distinto, o revisión manual).

### R4 — Efímero (EF): no sincronizar

- Notificaciones, `error_logs`, `ping`, `csp-violation`, `reviews`.
- El local los genera y los descarta; el impacto es cosmético.

### R5 — Externo (EX): fuera de banda

- WhatsApp/Twilio, DVR biométrico, Kiosco.
- Mientras no haya internet físicamente, esas integraciones no funcionan; el
  sistema debe **degradar sin romper** (ya lo hace: `withRoute` envuelve en
  try/catch y registra el error).

### R6 — Meta (ME): nunca se replica

- `sync_operations`, `backups`, `_migrations`, `query_logs`, `audit_logs`.
- Son del nodo que los produjo. Replicarlos rompería la deduplicación.

### Tabla resumen

| Clase | ¿Se aplica en el local sin internet? | ¿Se replica al reconectar? | ¿Fusión automática?                        |
| ----- | ------------------------------------ | -------------------------- | ------------------------------------------ |
| OP    | Sí                                   | Sí (local → VPS)           | Sí (por PK)                                |
| MA    | Solo lectura                         | Sí (VPS → local)           | Solo en alta nueva, con conflicto → humano |
| DI    | Sí (autoridad vigente)               | No                         | **No** — conflicto humano                  |
| EF    | Sí (descartable)                     | No                         | N/A                                        |
| EX    | No (depende de internet)             | N/A                        | N/A                                        |
| ME    | Sí (local del nodo)                  | No                         | N/A                                        |

---

## 5. Riesgos que rompen la sincronización

Ordenados por severidad para el modelo "traspaso de autoridad".

### 5.1 Alto — Las fotos viven en el filesystem, no en un bucket

`app/api/images/products/[filename]/route.ts` lee de
`join(process.cwd(), 'public', 'img', 'products')`. `app/api/users/route.ts`
escribe en `join(process.cwd(), 'public', 'img', 'users')`. No hay S3/R2.

- Si el local recibe una foto durante el corte, queda **solo en el disco del
  local**.
- La réplica lógica de Postgres no la mueve.
- **Falta:** replicación de archivos (rsync/objeto) o subida al bucket al
  reconectar. El `baucher_foto` de pedidos/entradas/ventas (migraciones 104,
  105, 107, 112) es **string en base** — ese sí viaja; las fotos de
  producto/usuario, no.

### 5.2 Alto — Identificadores y claves únicas

- **Secuencias `SERIAL/IDENTITY`**: los contadores de cada nodo divergen. Dos
  nodos crean `pedidos.id = 1001`. La réplica choca.
- `pedidos.codigo`: único por convención, **sin constraint** (lo dice la propia
  migración 040). Dos nodos pueden emitir el mismo código.
- Únicos naturales: DNI de cliente, `ventas.entrada_id` único (migración 091),
  email de usuario, `unique_permission` (module, action).
- **Falta:** una decisión de identidad distribuida. Opciones: UUID/ULID como PK
  de negocio, o reservar rangos de secuencia por nodo, o un `nodo_id` en cada
  fila. Sin esto, R1 no se sostiene para tablas con PK serial.

### 5.3 Medio — Sobreventa de stock

Si el local vende durante el corte y la VPS también, ambos descuentan del mismo
stock y la reconciliación puede dar **negativo**. `revisarReposicion()` se
dispara en `withRoute` para las rutas de inventario, pero no resuelve el
conflicto de dos nodos. Requiere reserva por nodo o ajuste manual.

### 5.4 Medio — Aprobaciones con estado

`solicitudes_cierre_caja`, `solicitudes_anulacion_*`, `solicitudes_anticipos`,
`solicitudes_devolucion_saldo`: son máquinas de estado. Un pedido aprobado en la
VPS y anulado en el local no tiene resolución automática correcta.

### 5.5 Bajo — Reloj y zona horaria

Mitigado por `stampDeviceDate` + `getNowInBusinessTimezone(deviceDate)`.
Correcto hoy; mantener la regla de que **todo** payload diferido lleve
`device_date`.

### 5.6 Bajo — Sesión y tokens

`auth/login`, `refresh` escriben `codigos`/`logins`. Durante el corte, el local
debe poder emitir y validar sesión sin la VPS. La app ya tiene
`utils/offlineSession.ts`; el dashboard necesita el equivalente.

---

## 6. Veredicto de viabilidad

**Sí es viable**, con tres condiciones explícitas:

1. **Traspaso de autoridad, no replicación simétrica.** "La remota es principal
   con internet, la local sin internet" se implementa como una **ventana
   declarada**: durante el corte manda el local; al reconectar, la VPS acepta la
   réplica del local para OP y **abre revisión humana** para DI.
2. **La escritura externa durante el corte se acota por clase.** OP puede seguir
   llegando (la app lo ya hace). MA no. DI no.
3. **Antes de escribir una línea de sync**: resolver §5.1 (fotos) y §5.2
   (identidad/unicidad). Son los dos que hacen que "sincronizar para no perder
   datos" falle en silencio.

**Lo que ya está hecho y no hay que rehacer:**

- Idempotencia (`sync_operations` + `runIdempotent` + `runRegistration`).
- Outbox de la app con 4 intenciones, orden, bloqueo y backoff.
- `device_date` en los payloads diferidos.

**Lo que falta construir (en orden de dependencia):**

1. Nodo local (Postgres + backend en la LAN, IP fija).
2. Replicación lógica **unidireccional** (local → VPS) para R1.
3. Réplica de lectura VPS → local (catálogo/config) para R2.
4. Identidad distribuida para §5.2 (bloqueante de R1).
5. Replicación de archivos para §5.1.
6. Cola de revisión humana para R3 (extender el panel de `getPendientes`).

---

## Anexo A — Reproducir el relevamiento

```bash
# Todos los handlers mutantes con método y línea
rg -n "^export const (POST|PUT|PATCH|DELETE)" app/api

# Archivos que escriben
rg -l "^export const (POST|PUT|PATCH|DELETE)" app/api

# El wrapper que aplica auth + permisos + auditoría + idempotencia
cat lib/api/withRoute.ts lib/api/registration.ts lib/api/idempotency.ts

# El ledger de idempotencia
cat migrations/040_sync_operations.sql lib/database/sync-operations.ts
```

## Anexo B — Mapa dominio → módulo → tablas

| Dominio de ruta                                                            | Módulo (`@/modules/...`)                                 | Tablas principales                                                                       |
| -------------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `auth`, `users`, `roles`, `permissions`, `hostesses`                       | `identidad`                                              | `usuarios`, `roles`, `permissions`, `codigos`, `logins`                                  |
| `products`, `categories`, `bar`, `purchases`, `transfers`, `cleaning`      | `inventario`                                             | `productos`, `categorias`, `inventario_*`, `compras`, `limpieza_*`                       |
| `orders`, `accounts`, `services`, `service-requests`, `rooms`              | `operacion`                                              | `pedidos`, `cuentas`, `servicios`, `solicitudes_atencion`, `habitaciones`                |
| `sales`                                                                    | `ventas`                                                 | `ventas`, `detalle_ventas`, `venta_logs`                                                 |
| `tickets`                                                                  | `entradas`                                               | `entradas_clientes`, `entradas_clientes_productos`                                       |
| `cashregister`                                                             | `caja`                                                   | `cajas`, `retiros_caja`, `solicitudes_cierre_caja`                                       |
| `clients`                                                                  | `clientes` (+ `workflows/clientes`, `workflows/prepago`) | `clientes`, `clientes_prepago_movimientos`, `devoluciones_ventas`                        |
| `attendance`, `biometric`, `biometrico`, `kiosk`                           | `asistencia`                                             | `asistencias`, `biometric_*`, `kiosk_devices`                                            |
| `advances`, `commissions`, `tips`, `gratifications`, `overtime`, `payroll` | `personal`                                               | `anticipos`, `comisiones`, `propinas`, `gratificaciones`, `horas_extras`, `pagos_nomina` |
| `meals`                                                                    | `colaciones`                                             | `colaciones`                                                                             |
| `quinchos`                                                                 | `quinchos` (+ `workflows/reservas-quincho`)              | `reservas_quincho`                                                                       |
| `notifications`, `whatsapp`                                                | `comunicaciones`                                         | `notificaciones`, `push_tokens`, `whatsapp_entregas`                                     |
| `configurations`, `settings`                                               | `configuracion`                                          | `configuraciones`, `backups`                                                             |
| `sync-operations`                                                          | —                                                        | `sync_operations`                                                                        |
