-- 008) foto opcional por presentación -------------------------------------------
-- Cada presentación puede tener su propia foto (botella vs lata vs caja).
-- NULL = usa la foto general del producto (fallback en la UI).
ALTER TABLE inventario_presentaciones
  ADD COLUMN IF NOT EXISTS foto varchar(255) DEFAULT NULL;
