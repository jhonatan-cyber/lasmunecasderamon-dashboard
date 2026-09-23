-- 014) presentación en el detalle de venta ----------------------------------------
-- Guarda qué presentación (formato) se vendió en cada línea, para
-- trazabilidad con el inventario del bar.
ALTER TABLE detalle_ventas
  ADD COLUMN IF NOT EXISTS presentacion_id varchar(36) DEFAULT NULL;
