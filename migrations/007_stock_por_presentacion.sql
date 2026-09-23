-- 007) stock por presentación, sin precio de compra universal --------------------
-- El stock vive por presentación: cada fila genera sus propios códigos de
-- unidad vinculados a ella. El total del producto (productos.stock_almacen)
-- se mantiene automáticamente como caché del conteo de unidades.
-- El precio de compra universal no se usa: cada presentación tiene el suyo.
ALTER TABLE productos
  DROP COLUMN IF EXISTS precio_compra;
