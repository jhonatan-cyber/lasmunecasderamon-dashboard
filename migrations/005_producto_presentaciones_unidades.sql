-- 005) presentaciones, precio de compra y códigos por unidad -------------------
-- El producto guarda su precio de compra y una o más presentaciones
-- (ej. "500 ml", "750 ml"). El código de barras del fabricante pertenece
-- a la presentación y no se puede repetir en otra presentación.
-- El stock genera un código único por unidad (LM-000001, ...) que se pega
-- al producto físico para su control en el sistema.
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS precio_compra integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS inventario_presentaciones (
  id varchar(36) PRIMARY KEY,
  producto_id varchar(36) NOT NULL REFERENCES productos(id_producto) ON DELETE CASCADE,
  nombre varchar(100) NOT NULL,
  codigo_barras varchar(50) DEFAULT NULL,
  fecha_crea timestamp NOT NULL DEFAULT now()
);
-- UNIQUE permite varios NULL: varias presentaciones pueden no tener código,
-- pero un código informado no se puede repetir.
CREATE UNIQUE INDEX IF NOT EXISTS uq_inventario_presentaciones_codigo_barras
  ON inventario_presentaciones (codigo_barras);

CREATE SEQUENCE IF NOT EXISTS inventario_sku_seq;

CREATE TABLE IF NOT EXISTS inventario_unidades (
  id varchar(36) PRIMARY KEY,
  producto_id varchar(36) NOT NULL REFERENCES productos(id_producto) ON DELETE CASCADE,
  presentacion_id varchar(36) DEFAULT NULL REFERENCES inventario_presentaciones(id) ON DELETE SET NULL,
  codigo varchar(20) NOT NULL UNIQUE,
  estado varchar(20) NOT NULL DEFAULT 'almacen',
  fecha_crea timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inventario_unidades_producto
  ON inventario_unidades (producto_id);
