-- 101) Fechas de lote: elaboración, duración y vencimiento --------------------
-- El formulario de producto y el de compra registran tres datos del lote:
-- fecha de elaboración, duración en meses y fecha de vencimiento. Con
-- elaboración + duración se calcula el vencimiento (lo resuelve la aplicación);
-- si se informa el vencimiento directamente, los otros dos no son necesarios.
-- Quedan en productos (dato del catálogo) y en detalle_compras (dato de cada
-- línea que ingresa a la bodega), siempre anulables: la mayoría de los
-- productos no tiene lote.
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS fecha_elaboracion date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS duracion_meses integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fecha_vencimiento date DEFAULT NULL;

ALTER TABLE detalle_compras
  ADD COLUMN IF NOT EXISTS fecha_elaboracion date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS duracion_meses integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fecha_vencimiento date DEFAULT NULL;
