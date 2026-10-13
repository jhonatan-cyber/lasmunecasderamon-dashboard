-- Conserva el acompañamiento por línea, sin deducirlo de configuraciones futuras.
ALTER TABLE detalle_ventas ADD COLUMN IF NOT EXISTS acompanamiento jsonb;
