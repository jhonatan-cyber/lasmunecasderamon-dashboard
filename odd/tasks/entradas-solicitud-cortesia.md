# Entradas: solicitud de cortesía en la puerta y entrega en la barra

Rama: `main` (working tree). Runner: `corepack pnpm test:unit` /
`corepack pnpm typecheck`. Estrategia de entrega: `ask-on-risk`. Repositorio con
refactor de nombres sin commitear: los archivos viven hoy en `app/tickets/` y
`app/api/tickets/`.

## Specs

- **S1 — La puerta sólo cobra la entrada.** El garzón registra N entradas con
  método de pago y cliente opcional. El servidor valida
  `monto_entrada = costo_entrada × N` (`costo_entrada` de `configuraciones`). En
  la puerta: **no** consume stock, **no** crea venta, **no** postea movimiento
  de caja. Las N filas de `entradas_clientes` quedan con
  `cortesia_estado = 'pendiente'`.
- **S2 — Tope de la cortesía.** Se lee de `configuraciones` clave
  `monto_base_trago_cortesia_cliente` (campo **"Covers de entradas"** en
  Configuraciones → tab "Bar y comisiones"), el mismo que ya usa
  `consumirProductoCortesia` como default. `costo_entrada` es sólo lo que se
  cobra.
- **S3 — Cola del bar.** `GET /api/tickets/pendientes?fecha=AAAA-MM-DD` devuelve
  una fila por persona con `cortesia_estado = 'pendiente'` (cliente, hora,
  método, `monto_entrada`, `grupo_registro_id`, `caja_id`). Permiso
  `entradas.deliver`.
- **S4 — Entrega como cortesía.** Si `precio_venta <= max(tope, monto_entrada)`
  la bebida es la cortesía: se consume una unidad del bar con movimiento tipo
  `cortesia` (`consumirProductoCortesiaBar`) y se postea **el monto de la
  entrada** a la caja con `registrarMovimientoCobro` (cubeta _entradas_). La
  fila queda `entregada` con `cover_presentacion_id`, `cortesia_entregada_por`,
  `cortesia_entregada_at`.
- **S5 — Entrega con adicional (upgrade).** Si
  `precio_venta > max(tope, monto_entrada)` se crea **una venta** con total =
  precio de lista de la bebida y detalle al precio de lista (el movimiento de
  inventario conserva el precio de lista y la trazabilidad `venta_id`). La fila
  queda `entregada`, `venta_id` de esa venta y
  `monto_bebida_adicional = precio − monto_entrada`. Lo que el cliente entrega
  en la barra es `precio − monto_entrada` (lo demás lo pagó en la puerta).
- **S6 — Invariante de cobro.** Cada entrada se postea exactamente una vez: o
  como movimiento de caja (cortesía) o como venta (upgrade), nunca ambas, nunca
  ninguna. Sólo se puede entregar una fila `pendiente` (una vez entregada o
  anulada, la segunda entrega se rechaza).
- **S7 — Barrido al cerrar caja.** Al pedir el cierre de una caja, las entradas
  `pendiente` cobradas en esa caja se postean como _entradas_ (el dinero se
  cobró; la cortesía no se entregó) y quedan `anulada` con
  `cortesia_entregada_at`. Una fila `anulada` no se entrega.
- **S8 — Permisos.** Módulo de catálogo `entradas` con acciones `view`,
  `create`, `deliver`. `view`: administrador, cajero, garzón, barman. `create`:
  administrador, cajero, garzón. `deliver`: administrador, barman, garzón. La
  ruta de página `/tickets` pasa a gatearse con `entradas.view`.
- **S9 — Idempotencia.** La clave de idempotencia del registro se deriva del
  _intento_ (cliente, cantidad, método) y **no** de `fecha`/`hora`; el envío
  repetido no duplica filas.
- **S10 — Aviso de configuración.** El card "Reglas de venta" avisa (sin
  bloquear el guardado) cuando
  `monto_base_trago_cortesia_cliente ≠ costo_entrada`, porque el modelo asume
  que el tope del cover y el precio de la entrada son el mismo dinero.

## Tasks

- ✅ T1 · Migración `097_entradas_cortesia_pendiente.sql`: `cortesia_estado`
  (default `'entregada'` para el histórico, CHECK
  `pendiente|entregada|anulada`), `cortesia_entregada_por`,
  `cortesia_entregada_at`, índice parcial de pendientes y filas de catálogo
  `entradas.view|create|deliver` con sus `role_permissions` (S1, S2, S7, S8).
- ✅ T2 · `lib/middleware/auth.ts` (`UserPermissions.entradas` +
  `createEmptyPermissions`), `modules/identidad/autenticacion/consultas.ts`
  (`ADMIN_PERMS`) y `lib/constants/route-permissions.ts` (`/tickets` →
  `entradas.view`) (S8).
- ✅ T3 · `modules/entradas/repositorio.ts` reescrito: `registrarEntrada` sin
  stock/venta/caja, `listarPendientes`, `entregarEntrada` (cortesía vs upgrade
  con `FOR UPDATE`), `anularEntrada`, `postearPendientesDeCaja`,
  `listarEntradas` con estado (S1-S7).
- ✅ T4 · Rutas: `app/api/tickets/route.ts` (POST simplificado,
  `entradas.create`), `app/api/tickets/pendientes/route.ts`,
  `app/api/tickets/[id]/entregar/route.ts` (orquesta `SaleService`),
  `app/api/tickets/[id]/anular/route.ts` (S1, S3, S4, S5).
- ✅ T5 · `app/tickets/page.tsx`: 1188 → 652 líneas, sin
  productos/adicional/acompañamiento ni fetch de venta; formulario de puerta,
  estado por grupo y "Anular pendientes" (S1, S9).
- ✅ T6 · `components/bar/CortesiasTab.tsx` + tab "Cortesías" en
  `app/bar/page.tsx` (+39/−4, aditivo) (S3, S4, S5).
- ✅ T7 · `app/api/cashregister/closing/route.ts`: barrido
  `postearPendientesDeCaja` antes de `solicitarOProcesarCierreCaja`;
  `entradasPendientes` en la respuesta (S7).
- ✅ T8 · `components/settings/SettingsServiceLevelsCard.tsx`: aviso no
  bloqueante cuando covers ≠ costo de entrada (S10).
- ✅ T9 · Tests: `tests/unit/modules/entradas/entradas-cortesia.test.ts` (13) y
  `tests/unit/app/ticketsRoute.test.ts` (9) verdes; se borraron los dos tests
  del flujo anterior y se alineó el fixture de `permissions-cache` (S1-S8).

Checks observados: `eslint` sin salida (exit 0) en todos los archivos tocados;
`typecheck` sólo con el error ajeno preexistente
`scripts/playwright/duration-budget-reporter.ts(44,3)`; `arquitectura:limites` 0
hallazgos.

## Log

- L1 · Pedido original (verbatim): "el garzon no cobra adicional solo entrada el
  cliente cuando esta en la barra decide si va a pagar adicional por otra
  bebida".
- L2 · Corrección (verbatim): "el dinero no tendria que entrar todavia a la caja
  de movimiento de cobro cuando el garzon cobra ya que si el cliente decide por
  adicional todo el monto de la entrada mas el adicional se va a ventas , y si
  solo recibe su cortesia se va a entradas".
- L3 · Decisión: el tope de la cortesía sale de
  `monto_base_trago_cortesia_cliente` ("Covers de entradas"), no de
  `costo_entrada` (verbatim: "el tope de costo de la cortesia se define o se
  configura en configuraciones en el tab bar y comisiones").
- L4 · Autorización: "realizalo".
- L5 · Decisión de diseño: umbral = `max(tope, monto_entrada)`. Con
  `tope < costo_entrada` una bebida más barata que lo ya pagado no puede
  cobrarse extra (la diferencia sería negativa y la caja quedaría con más
  efectivo que ventas). El aviso de T8 cubre la configuración invertida.
- L6 · Decisión de diseño: la venta del upgrade lleva el **precio de lista
  completo** y el cliente paga `precio − monto_entrada` en la barra; así lo
  posteado en caja (entradas + ventas) siempre iguala lo cobrado (puerta +
  barra).
- L7 · Evidencia: barrido del cierre en el adaptador HTTP (no en `modules/caja`)
  para no crear el ciclo `caja ↔ entradas`; `arquitectura:limites` → 0
  hallazgos.
- L8 · Evidencia (suite): `corepack pnpm test:unit` completa → exit 0, 381
  archivos / 2959 tests pasados, 2 skipped. Una corrida anterior salió exit 1
  con 0 tests fallidos: fue un pico transitorio del `DurationBudgetReporter`
  (presupuesto 30 s por archivo), no una regresión; la repetición limpia lo
  confirma.
- L9 · Evidencia (migración): `corepack pnpm db:migrate` →
  `Applied: 097_entradas_cortesia_pendiente.sql` (exit 0). Verificado contra la
  BD real: `cortesia_estado varchar(20) NOT NULL DEFAULT 'entregada'`,
  `cortesia_entregada_por` FK a `usuarios(id_usuario)`, `cortesia_entregada_at`,
  CHECK de los tres estados, índice parcial `idx_entradas_clientes_pendientes`
  con `WHERE cortesia_estado = 'pendiente'`, 3 filas en `permissions`
  (`entradas.view/create/deliver`, 0 huérfanas sin grant) y 9 grants (view:
  administrador/cajero/garzón/barman; create: administrador/cajero/garzón;
  deliver: administrador/barman/garzón). El aviso de `db:plan` ("tiene trabajo
  que el esquema no puede confirmar (insert into permissions)") es informativo:
  `scripts/migration-effects.mjs` no adopta por esquema un archivo con `INSERT`,
  así que lo ejecuta, que es lo buscado.
- L10 · Evidencia (build): `corepack pnpm build` → exit 0,
  `Build completed successfully` y service worker con 545 entradas de precache.
  Con el heap por defecto (2 GB) el build moría por
  `JavaScript heap out of memory` (máquina de 7,2 GB con ~2,2 GB libres), así
  que en este entorno hay que correrlo con
  `NODE_OPTIONS=--max-old-space-size=3072`. Es una limitación del entorno, no
  del cambio.
- L11 · Nota: nada commiteado todavía. El árbol de trabajo viene a mitad de un
  refactor grande de renombres (español → inglés) sin commitear, así que un
  commit de esta feature se mezclaría con trabajo ajeno.
