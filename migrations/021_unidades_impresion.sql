ALTER TABLE inventario_unidades
  ADD COLUMN IF NOT EXISTS fecha_impresion timestamptz;
