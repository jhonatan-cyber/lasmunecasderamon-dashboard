-- Producto incluido, consumos adicionales y asignaciones vigentes sin perder comisiones.
ALTER TABLE servicios ADD COLUMN IF NOT EXISTS producto_incluido_presentacion_id varchar(36);
ALTER TABLE inventario_movimientos ADD COLUMN IF NOT EXISTS servicio_id varchar(36);
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS servicio_id varchar(36);
ALTER TABLE detalle_servicios ADD COLUMN IF NOT EXISTS liberado_en timestamp;
CREATE INDEX IF NOT EXISTS idx_movimientos_servicio ON inventario_movimientos(servicio_id) WHERE servicio_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ventas_servicio ON ventas(servicio_id) WHERE servicio_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_servicio_anfitrionas_vigentes ON detalle_servicios(servicio_id, usuario_id) WHERE liberado_en IS NULL;
