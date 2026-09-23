-- Configuración por presentación y copia histórica de los importes transferidos.
ALTER TABLE inventario_presentaciones ADD COLUMN IF NOT EXISTS opciones_venta jsonb;
ALTER TABLE inventario_movimientos ADD COLUMN IF NOT EXISTS opciones_venta jsonb;

UPDATE inventario_presentaciones
SET opciones_venta = jsonb_build_array(jsonb_build_object(
  'tipo', 'botella', 'precio', precio_venta, 'comision', comision
)) WHERE opciones_venta IS NULL;

UPDATE inventario_movimientos
SET opciones_venta = jsonb_build_array(jsonb_build_object(
  'tipo', 'botella', 'precio', COALESCE(precio_venta, 0), 'comision', COALESCE(comision, 0)
)) WHERE tipo = 'traspaso' AND opciones_venta IS NULL;
