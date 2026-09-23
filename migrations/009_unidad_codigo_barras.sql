-- 009) código de barras por unidad ----------------------------------------------
-- Cada unidad física lleva, además de su código interno (LM-000001, ...),
-- un código de barras EAN-13 de uso interno (prefijo 29, reservado para
-- códigos de tienda) diferente por unidad, para imprimir y pegar al producto.
-- NULL solo en unidades creadas antes de esta migración: la app los completa.
ALTER TABLE inventario_unidades
  ADD COLUMN IF NOT EXISTS codigo_barras varchar(20) DEFAULT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_inventario_unidades_codigo_barras
  ON inventario_unidades (codigo_barras);
