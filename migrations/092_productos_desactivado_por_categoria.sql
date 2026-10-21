-- 092) Marca de desactivación por categoría -------------------------------
-- Permite reactivar una categoría sin revivir productos que un usuario
-- desactivó manualmente. Se enciende solo para los productos que estaban
-- activos cuando se desactivó la categoría.
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS desactivado_por_categoria boolean NOT NULL DEFAULT false;
