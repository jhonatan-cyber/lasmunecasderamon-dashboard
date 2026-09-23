-- Preserve existing codes; only new purchases assign an origin.
ALTER TABLE inventario_unidades
  ADD COLUMN IF NOT EXISTS compra_id varchar(36) REFERENCES compras(id);
CREATE INDEX IF NOT EXISTS idx_inventario_unidades_compra
  ON inventario_unidades (compra_id);
