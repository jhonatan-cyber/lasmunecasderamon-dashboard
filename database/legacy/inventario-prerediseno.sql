-- ============================================================
-- Inventario: diseño previo a 84b61fd (retirado por la migración 023)
--
-- Qué es
--   El DDL de las 5 tablas del primer módulo de inventario. Se extrajo de la
--   base local el 2026-09-22, ANTES de moverlas al schema "legacy_inventario"
--   para poder aplicar las migraciones 005-021. Las cinco estaban vacías
--   (0 filas), y así se retiraron.
--
-- De dónde salieron
--   `inventario_presentaciones` e `inventario_unidades` vienen del volcado
--   MySQL de origen (database/lasmunecasderamon.sql). Las otras tres
--   (`inventario_productos`, `inventario_movimientos`,
--   `inventario_movimiento_unidades`) las creó una migración local
--   (003_inventory.sql) que nunca llegó al repositorio: es la única fila
--   huérfana que queda en `_postgres_migrations`.
--
-- Por qué se retira (en vez de quedarse como schema vivo)
--   1. El rediseño de 84b61fd usa los MISMOS nombres para otras tablas
--      (`inventario_presentaciones`, `inventario_unidades`,
--      `inventario_movimientos`) con otra forma: mantener el schema agrega
--      copias fantasma de tres tablas vivas a cualquier pg_dump de
--      infraestructura y confunde a quien lea la base.
--   2. La aplicación nunca las consultó: todo el código filtra por
--      `current_schema()` (= public), así que no aportaban nada.
--   3. No había datos que preservar y los nombres no coinciden con el diseño
--      actual, así que tampoco servían como respaldo restaurable directo.
--
-- Este archivo es el registro histórico. No forma parte de la instalación ni se
-- ejecuta: la instalación se define con las migraciones.
--
-- Para recuperarlas (solo si alguna vez hacen falta)
--   1. `CREATE SCHEMA legacy_inventario;`
--   2. Ejecutar este archivo con los CREATE INDEX apuntando al schema correcto
--      (abajo dicen `public.`: cámbialos antes, o libera temporalmente los
--      nombres actuales si vas a restaurar en public).
--   3. Las FK esperan `categorias`, `productos`, `usuarios` y entre las propias
--      tablas legacy, así que primero restaura las cinco y después las
--      restricciones.
-- ============================================================

CREATE TABLE inventario_productos (
  id character varying(36) NOT NULL,
  nombre character varying(180) NOT NULL,
  categoria_id character varying(36) NOT NULL,
  descripcion text NOT NULL DEFAULT ''::text,
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE inventario_productos ADD CONSTRAINT inventario_productos_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES categorias(id_categoria) DEFERRABLE;
ALTER TABLE inventario_productos ADD CONSTRAINT inventario_productos_pkey PRIMARY KEY (id);
CREATE UNIQUE INDEX inventario_producto_nombre ON public.inventario_productos USING btree (categoria_id, lower((nombre)::text));

CREATE TABLE inventario_presentaciones (
  id character varying(36) NOT NULL,
  producto_id character varying(36) NOT NULL,
  nombre character varying(60) NOT NULL,
  codigo_barras character varying(80),
  producto_bar_id character varying(36),
  creado_en timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE inventario_presentaciones ADD CONSTRAINT inventario_presentaciones_pkey PRIMARY KEY (id);
ALTER TABLE inventario_presentaciones ADD CONSTRAINT inventario_presentaciones_producto_bar_id_fkey FOREIGN KEY (producto_bar_id) REFERENCES productos(id_producto) DEFERRABLE;
ALTER TABLE inventario_presentaciones ADD CONSTRAINT inventario_presentaciones_producto_bar_id_key UNIQUE (producto_bar_id);
ALTER TABLE inventario_presentaciones ADD CONSTRAINT inventario_presentaciones_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES inventario_productos(id) DEFERRABLE;
ALTER TABLE inventario_presentaciones ADD CONSTRAINT inventario_presentaciones_producto_id_nombre_key UNIQUE (producto_id, nombre);
CREATE UNIQUE INDEX inventario_codigo_barras ON public.inventario_presentaciones USING btree (codigo_barras) WHERE (codigo_barras IS NOT NULL);

CREATE TABLE inventario_unidades (
  id character varying(36) NOT NULL,
  sku character varying(32) NOT NULL,
  presentacion_id character varying(36) NOT NULL,
  estado text NOT NULL DEFAULT 'inventario'::text,
  ingreso_id character varying(36) NOT NULL,
  creado_en timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE inventario_unidades ADD CONSTRAINT inventario_unidades_estado_check CHECK ((estado = ANY (ARRAY['inventario'::text, 'bar'::text, 'vendido'::text])));
ALTER TABLE inventario_unidades ADD CONSTRAINT inventario_unidades_ingreso_id_fkey FOREIGN KEY (ingreso_id) REFERENCES inventario_movimientos(id) DEFERRABLE;
ALTER TABLE inventario_unidades ADD CONSTRAINT inventario_unidades_pkey PRIMARY KEY (id);
ALTER TABLE inventario_unidades ADD CONSTRAINT inventario_unidades_presentacion_id_fkey FOREIGN KEY (presentacion_id) REFERENCES inventario_presentaciones(id) DEFERRABLE;
ALTER TABLE inventario_unidades ADD CONSTRAINT inventario_unidades_sku_key UNIQUE (sku);
CREATE INDEX inventario_stock ON public.inventario_unidades USING btree (presentacion_id, estado, creado_en, id);

CREATE TABLE inventario_movimientos (
  id character varying(36) NOT NULL,
  tipo text NOT NULL,
  presentacion_id character varying(36) NOT NULL,
  cantidad integer NOT NULL,
  precio integer,
  comision integer,
  referencia text,
  nota character varying(500) NOT NULL DEFAULT ''::character varying,
  usuario_id character varying(36) NOT NULL,
  creado_en timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE inventario_movimientos ADD CONSTRAINT inventario_movimientos_cantidad_check CHECK ((cantidad > 0));
ALTER TABLE inventario_movimientos ADD CONSTRAINT inventario_movimientos_comision_check CHECK ((comision >= 0));
ALTER TABLE inventario_movimientos ADD CONSTRAINT inventario_movimientos_pkey PRIMARY KEY (id);
ALTER TABLE inventario_movimientos ADD CONSTRAINT inventario_movimientos_precio_check CHECK ((precio >= 0));
ALTER TABLE inventario_movimientos ADD CONSTRAINT inventario_movimientos_presentacion_id_fkey FOREIGN KEY (presentacion_id) REFERENCES inventario_presentaciones(id) DEFERRABLE;
ALTER TABLE inventario_movimientos ADD CONSTRAINT inventario_movimientos_tipo_check CHECK ((tipo = ANY (ARRAY['ingreso'::text, 'traspaso'::text, 'venta'::text, 'devolucion'::text])));
ALTER TABLE inventario_movimientos ADD CONSTRAINT inventario_movimientos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id_usuario) DEFERRABLE;
CREATE INDEX inventario_referencia ON public.inventario_movimientos USING btree (referencia);

CREATE TABLE inventario_movimiento_unidades (
  movimiento_id character varying(36) NOT NULL,
  unidad_id character varying(36) NOT NULL
);
ALTER TABLE inventario_movimiento_unidades ADD CONSTRAINT inventario_movimiento_unidades_movimiento_id_fkey FOREIGN KEY (movimiento_id) REFERENCES inventario_movimientos(id) DEFERRABLE;
ALTER TABLE inventario_movimiento_unidades ADD CONSTRAINT inventario_movimiento_unidades_pkey PRIMARY KEY (movimiento_id, unidad_id);
ALTER TABLE inventario_movimiento_unidades ADD CONSTRAINT inventario_movimiento_unidades_unidad_id_fkey FOREIGN KEY (unidad_id) REFERENCES inventario_unidades(id) DEFERRABLE;
CREATE INDEX inventario_trazabilidad ON public.inventario_movimiento_unidades USING btree (unidad_id);
