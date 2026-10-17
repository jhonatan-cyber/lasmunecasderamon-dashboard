ALTER TABLE colaciones
  ADD COLUMN IF NOT EXISTS presentacion_id varchar(36)
    REFERENCES inventario_presentaciones(id),
  ADD COLUMN IF NOT EXISTS nombre_bebida text,
  ADD COLUMN IF NOT EXISTS acompanamiento varchar(20)
    CHECK (acompanamiento IN ('gaseosa', 'soda'));

CREATE INDEX IF NOT EXISTS idx_colaciones_presentacion
  ON colaciones(presentacion_id);
ALTER TABLE colaciones
  ALTER COLUMN precio SET DEFAULT 0,
  ALTER COLUMN metodo_pago SET DEFAULT 'efectivo';

ALTER TABLE colaciones
  DROP CONSTRAINT IF EXISTS colaciones_precio_check,
  ADD CONSTRAINT colaciones_precio_no_negativo CHECK (precio >= 0);
