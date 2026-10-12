-- Mantiene la presentación, tipo de venta y acompañamiento hasta su facturación.
ALTER TABLE detalle_pedidos ADD COLUMN IF NOT EXISTS configuracion_venta jsonb;
ALTER TABLE detalle_cuentas ADD COLUMN IF NOT EXISTS configuracion_venta jsonb;
