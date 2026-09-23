-- 006) precio de compra por presentación ---------------------------------------
-- Cada presentación (500 ml, 750 ml, ...) tiene su propio precio de compra,
-- ya que el costo varía según el formato.
ALTER TABLE inventario_presentaciones
  ADD COLUMN IF NOT EXISTS precio_compra integer NOT NULL DEFAULT 0;
