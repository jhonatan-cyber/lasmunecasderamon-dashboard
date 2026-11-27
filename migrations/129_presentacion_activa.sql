ALTER TABLE inventario_presentaciones
  ADD COLUMN IF NOT EXISTS activa boolean NOT NULL DEFAULT true;