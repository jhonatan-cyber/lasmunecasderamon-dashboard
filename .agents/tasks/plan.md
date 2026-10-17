# Implementation Plan — Seeds de Categorías y Clientes

Meta: crear `seed/seed-categorias.mjs` y `seed/seed-clientes.mjs` (ESM, CLI
standalone) y agregar sus npm scripts a `package.json`. Ambos siguen el patrón
de `seed/seed-asistencia.mjs`: importan la config de DB desde
`../lib/database/postgres.cjs`, sólo corren en PostgreSQL local de desarrollo,
usan transacción (BEGIN/COMMIT/ROLLBACK), soportan `--dry-run` y son
idempotentes.

## Decisiones de diseño (fundamentadas en el código leído)

- **Esquema real de `categorias`** (`database/lasmunecasderamon.postgres.sql`
  líneas 106-114 + `ALTER TABLE` línea 1114 + migración 076):
  `id_categoria varchar(36) NOT NULL` (PK), `nombre varchar(255) NOT NULL`,
  `descripcion text NOT NULL DEFAULT 'Sin descripción'`,
  `estado integer NOT NULL DEFAULT 1`, `fecha_crea timestamp NOT NULL`,
  `fecha_mod timestamp NULL`, `fecha_baja timestamp NULL`,
  `display_order integer DEFAULT 0`, y `system_key text UNIQUE` (añadido en
  migración 076). No hay CHECK constraints sobre la tabla. No hay índice UNIQUE
  sobre `nombre` (la unicidad de nombre la valida la app en
  `modules/inventario/categorias/repositorio.ts` `CategoryRepository.create`,
  que rechaza duplicados case-insensitive).
- **Categoría protegida**: la migración 076/078 crea y protege la categoría con
  `system_key = 'bebidas_analcoholicas'` (nombre "Bebidas analcohólicas")
  mediante triggers que bloquean DELETE/TRUNCATE y el cambio de
  nombre/estado/system_key/id. El seed NO debe tocar esa categoría: deja
  `system_key = NULL` en todas sus filas y no incluye el nombre "Bebidas
  analcohólicas".
- **Esquema real de `clientes`** (`database/lasmunecasderamon.postgres.sql`
  líneas 117-127 + `ALTER TABLE` línea 1115): `id_cliente varchar(36) NOT NULL`
  (PK), `run varchar(20) NULL`, `nombre varchar(255) NOT NULL`,
  `apellido varchar(255) NOT NULL`, `telefono varchar(50) NULL`,
  `fecha_crea timestamp NOT NULL`, `fecha_mod timestamp NULL`,
  `estado integer NOT NULL DEFAULT 1`, `saldo integer DEFAULT 0`. No hay CHECK
  constraints ni UNIQUE sobre `run` ni sobre nombre+apellido. **No existe
  columna `email` ni `documento`**: el documento boliviano (CI) va en la columna
  `run` (es el único campo de identificación disponible y es el que usa la app:
  `modules/clientes/fichas/repositorio.ts` `crearCliente` inserta
  `run: data.run || ''`). El seed no intentará escribir email.
- **Idempotencia**: no hay UNIQUE de negocio en la DB para ninguna de las dos
  tablas, así que la idempotencia se garantiza con (a) un `id` determinista
  derivado de `createHash('sha256')` (patrón usado en `seed-asistencia.mjs`) y
  (b) un `WHERE NOT EXISTS` sobre la clave de negocio (`lower(nombre)` para
  categorías, `lower(run)` para clientes) más `ON CONFLICT (id_…) DO NOTHING`
  como respaldo. Re-ejecutar el seed es seguro: mismas entradas → mismos IDs →
  se omiten las existentes.
- **IDs deterministas** (caben en `varchar(36)`, formato UUID 8-4-4-4-12 = 36
  chars):
  `const h = createHash('sha256').update('seed-categorias-v1:'+nombre).digest('hex'); const id = `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}``.
  Para clientes se usa `'seed-clientes-v1:'+run` como semilla. Así el
  `ON CONFLICT (id_categoria/id_cliente) DO NOTHING` es efectivo entre
  ejecuciones.
- **Patrón ESM y seguridad**: copiar de `seed-asistencia.mjs`:
  `import 'dotenv/config'; import { createHash } from 'node:crypto'; import pg from 'pg'; import postgres from '../lib/database/postgres.cjs';`.
  La verificación de "sólo local" lanza si
  `process.env.NODE_ENV === 'production'` o `config.host` no está en
  `['localhost','127.0.0.1','::1']` (exactamente igual que `seed-asistencia.mjs`
  y `ci-seed-auth.cjs`). `connectionConfig()` ya trae
  `options: '-c timezone=America/Santiago'`.
- **`fecha_crea`**: usar `new Date()` (pg lo serializa y la DB lo guarda como
  `timestamp` en la zona de sesión). Es lo más simple y válido para un seed; no
  requiere replicar `getNowInBusinessTimezone` (que es código de la app,
  server-only).
- **`LOCK TABLE … IN SHARE ROW EXCLUSIVE MODE`** al inicio de cada transacción
  (igual que `seed-asistencia.mjs`) para serializar ejecuciones concurrentes del
  mismo seed.
- **Salida**: `console.table` con un resumen por fila (categoría/cliente →
  insertado vs. ya existente), seguido de un mensaje con totales. El encabezado
  lleva
  `/* eslint-disable no-console -- Salida de la herramienta CLI de desarrollo. */`
  como `seed-asistencia.mjs`.
- **No usar `require`**: los seeds son `.mjs` y siguen el patrón ESM. No
  modificar ningún archivo existente salvo `package.json`.
- **Nota sobre AGENTS.md (reglas de Next.js)**: los seeds son scripts CLI
  standalone de Node (usan `pg` y `dotenv`), no código de la app Next.js, por lo
  que la obligación de leer `node_modules/next/dist/docs/` no aplica a estos
  archivos. La edición de `package.json` sólo añade dos entradas a `scripts` y
  no toca el pipeline de build.

---

## Plan

- [ ] 1. Crear `seed/seed-categorias.mjs` que puebla la tabla `categorias` con
      categorías realistas de bar/discoteca. **Qué hacer**: script ESM
      standalone siguiendo el patrón de `seed/seed-asistencia.mjs`. Cabecera
      `/* eslint-disable no-console */`, luego
      `import 'dotenv/config'; import { createHash } from 'node:crypto'; import pg from 'pg'; import postgres from '../lib/database/postgres.cjs';`.
      Calcula `config = postgres.connectionConfig()` y lanza
      `Error('El seed de categorías sólo se ejecuta en PostgreSQL local de desarrollo.')`
      si `NODE_ENV === 'production'` o `config.host` no es
      `localhost/127.0.0.1/::1`. `dryRun = process.argv.includes('--dry-run')`.
      Define un array `CATEGORIAS` (ver valores abajo). Flujo:
      `client.connect()` → `BEGIN` →
      `LOCK TABLE categorias IN SHARE ROW EXCLUSIVE MODE` → por cada categoría,
      genera `id` determinista (sha256 de `'seed-categorias-v1:'+nombre`,
      formato UUID 8-4-4-4-12) y ejecuta
      `INSERT INTO categorias (id_categoria, nombre, descripcion, estado, fecha_crea, display_order) SELECT $1,$2,$3,1,$4,$5 WHERE NOT EXISTS (SELECT 1 FROM categorias WHERE lower(nombre)=lower($2)) ON CONFLICT (id_categoria) DO NOTHING RETURNING id_categoria`
      con `[$1=id, $2=nombre, $3=descripcion, $4=new Date(), $5=display_order]`.
      Cuenta insertados (RETURNING trae fila) vs. ya existentes. Luego `COMMIT`
      (o `ROLLBACK` si `dryRun`). `console.table` con columnas
      `{nombre, display_order, estado:'insertado'|'ya existia'}` y un mensaje de
      totales. `catch`: `ROLLBACK` (`.catch(()=>{})`),
      `console.error(error.message)`, `process.exitCode=1`. `finally`:
      `client.end()`. No escribir `system_key` (queda NULL). **Columnas
      insertadas**:
      `id_categoria, nombre, descripcion, estado(=1), fecha_crea, display_order`.
      (No se tocan `fecha_mod`, `fecha_baja`, `system_key`.) **Idempotencia**:
      ID determinista por nombre + `WHERE NOT EXISTS (lower(nombre))` +
      `ON CONFLICT (id_categoria) DO NOTHING`. **Categorías (nombre,
      descripcion, display_order)** — alineadas con las claves de
      `CANTIDAD_POR_CATEGORIA` en `seed/seed-traspasos.mjs` para que ese seed
      encuentre las categorías, más dos extras comunes: 1. `Cerveza` —
      `"Cervezas nacionales e importadas"` — display_order 1 2.
      `Bebidas Sin Alcohol` — `"Bebidas sin alcohol y acompañamientos"` —
      display_order 2 3. `Snacks` — `"Snacks y pasabocas"` — display_order 3 4.
      `Vinos` — `"Vinos tintos y blancos"` — display_order 4 5. `Champagne` —
      `"Champañas y espumantes"` — display_order 5 6. `Pisco` — `"Piscos"` —
      display_order 6 7. `Tequila` — `"Tequilas"` — display_order 7 8. `Ron` —
      `"Rones"` — display_order 8 9. `Vodka` — `"Vodkas"` — display_order 9 10.
      `Whisky` — `"Whiskys"` — display_order 10 11. `Energizantes` —
      `"Bebidas energizantes para mezclas"` — display_order 11 12. `Cigarrillos`
      — `"Cigarrillos y tabaco"` — display_order 12 (No incluir "Bebidas
      analcohólicas": está protegida y la crea la migración 076.) **Archivos**:
      `seed/seed-categorias.mjs` (nuevo) **Verificar**:
      `node --check seed/seed-categorias.mjs` → sintaxis OK (exit 0). Luego, con
      PostgreSQL local de desarrollo levantado y el esquema aplicado:
      `node seed/seed-categorias.mjs --dry-run` → imprime "Simulación: ..." +
      `console.table` y termina sin error (no escribe por el ROLLBACK). Ejecutar
      `node seed/seed-categorias.mjs` →
      `SELECT count(*) FROM categorias WHERE nombre IN ('Cerveza','Whisky',...)`
      devuelve las 12 y re-ejecutar `node seed/seed-categorias.mjs` no crea
      duplicados (todas "ya existia").

- [ ] 2. Crear `seed/seed-clientes.mjs` que puebla la tabla `clientes` con 25
      clientes bolivianos realistas. **Qué hacer**: script ESM standalone con el
      mismo patrón que el ítem 1. Mensaje de safety:
      `'El seed de clientes sólo se ejecuta en PostgreSQL local de desarrollo.'`.
      `dryRun = process.argv.includes('--dry-run')`. Define un array `CLIENTES`
      de 25 objetos `{run, nombre, apellido, telefono}` con datos bolivianos
      realistas (ver enfoque abajo). Flujo: `client.connect()` → `BEGIN` →
      `LOCK TABLE clientes IN SHARE ROW EXCLUSIVE MODE` → por cada cliente,
      genera `id` determinista (sha256 de `'seed-clientes-v1:'+run`, formato
      UUID 8-4-4-4-12) y ejecuta
      `INSERT INTO clientes (id_cliente, run, nombre, apellido, telefono, fecha_crea, estado, saldo) SELECT $1,$2,$3,$4,$5,$6,1,0 WHERE NOT EXISTS (SELECT 1 FROM clientes WHERE lower(run)=lower($2)) ON CONFLICT (id_cliente) DO NOTHING RETURNING id_cliente`
      con `[$1=id, $2=run, $3=nombre, $4=apellido, $5=telefono, $6=new Date()]`.
      Cuenta insertados vs. existentes. `COMMIT`/`ROLLBACK`. `console.table` con
      `{run, nombre, apellido, telefono, estado:'insertado'|'ya existia'}` +
      totales. `catch`/`finally` igual que el ítem 1. **Columnas insertadas**:
      `id_cliente, run, nombre, apellido, telefono, fecha_crea, estado(=1), saldo(=0)`.
      (No se tocan `fecha_mod`.) No hay columna `email`; no se escribe.
      **Idempotencia**: ID determinista por `run` +
      `WHERE NOT EXISTS (lower(run))` + `ON CONFLICT (id_cliente) DO NOTHING`.
      **Datos bolivianos (enfoque y cantidad)**: generar 25 clientes (dentro del
      rango 20-30 pedido). `run` = CI boliviano, 7-8 dígitos, únicos, algunos
      con sufijo de departamento (`-LP`, `-CB`, `-SC`, `-OR`, `-PT`) — todos
      caben en `varchar(20)` (ej. `12345678-LP` = 11 chars). `telefono` = móvil
      boliviano en formato `+591 7XXXXXXXX` o `+591 6XXXXXXXX` (8 dígitos tras
      +591, números móviles bolivianos empiezan en 7 o 6). `nombre`/`apellido` =
      nombres y apellidos bolivianos comunes (apellidos: Mamani, Quispe, Choque,
      Flores, Rodríguez, García, Pérez, Gonzales, Vargas, Lara, Rojas, Mendoza,
      Condori, Ayma; nombres: Carlos, María, José, Luis, Ana, Carmen, Fernando,
      Patricia, Diego, Sofía, Marco, Lucía, Raúl, Verónica). Definir el array
      explícito en el script (25 filas), no generarlo con aleatorios no
      deterministas (los IDs ya son deterministas, pero los datos deben ser
      estables y legibles). `estado=1`, `saldo=0` para todos. **Archivos**:
      `seed/seed-clientes.mjs` (nuevo) **Verificar**:
      `node --check seed/seed-clientes.mjs` → sintaxis OK (exit 0). Con DB local
      levantada: `node seed/seed-clientes.mjs --dry-run` → "Simulación: ..." +
      tabla, sin error. `node seed/seed-clientes.mjs` →
      `SELECT count(*) FROM clientes` aumenta en 25 (o menos si ya existían) y
      re-ejecutar no crea duplicados.

- [ ] 3. Actualizar `package.json` agregando los dos npm scripts junto a
      `seed:asistencia`. **Qué hacer**: en `package.json`, en el bloque
      `"scripts"`, insertar inmediatamente después de la línea
      `"seed:asistencia": "node seed/seed-asistencia.mjs",` dos nuevas líneas:
      `     "seed:categorias": "node seed/seed-categorias.mjs",     "seed:clientes": "node seed/seed-clientes.mjs",     `
      (Mantener el JSON válido: coma al final de cada línea nueva; la línea
      siguiente `"db:migrate"` ya tiene su coma. No alterar otras entradas.)
      **Archivos**: `package.json` (modificar) **Verificar**:
      `node -e "const s=require('./package.json').scripts; console.log(s['seed:categorias'], s['seed:clientes'])"`
      → imprime `node seed/seed-categorias.mjs node seed/seed-clientes.mjs`
      (confirma JSON válido y entradas presentes).
      `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('ok')"`
      → `ok`.

- [ ] 4. Verificación cruzada final (sin escribir código). **Qué hacer**:
      confirmar que ambos seeds corren en seco y que los scripts están
      expuestos. **Verificar**:
      `node --check seed/seed-categorias.mjs && node --check seed/seed-clientes.mjs`
      → exit 0. (Con DB local:) `pnpm run seed:categorias -- --dry-run` y
      `pnpm run seed:clientes -- --dry-run` → ambos terminan sin error y
      muestran su tabla de resumen. `pnpm run` (listado) muestra
      `seed:categorias` y `seed:clientes`.
