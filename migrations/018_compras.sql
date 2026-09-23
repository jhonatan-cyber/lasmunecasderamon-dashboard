-- 018) módulo compras (solo stock, sin caja) --------------------------------------
-- Registra ingresos de mercadería al almacén: genera unidades por presentación.
CREATE SEQUENCE IF NOT EXISTS compras_folio_seq START 1;

CREATE TABLE IF NOT EXISTS compras (
  id varchar(36) PRIMARY KEY,
  folio varchar(20) NOT NULL UNIQUE,
  total integer NOT NULL DEFAULT 0,
  observaciones text,
  usuario_id varchar(36),
  fecha_crea timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_compras_fecha ON compras (fecha_crea DESC);

CREATE TABLE IF NOT EXISTS detalle_compras (
  id varchar(36) PRIMARY KEY,
  compra_id varchar(36) NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
  producto_id varchar(36) NOT NULL,
  presentacion_id varchar(36),
  cantidad integer NOT NULL,
  precio_compra integer NOT NULL DEFAULT 0,
  subtotal integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_detalle_compras_compra ON detalle_compras (compra_id);
