-- 010) inventario del bar --------------------------------------------------------
-- Las unidades viajan: almacen -> bar -> vendido. El traspaso toma las
-- unidades activas más antiguas (FIFO) y define precio de venta y comisión
-- por presentación. Todo movimiento queda en inventario_movimientos.
ALTER TABLE inventario_unidades
  ADD COLUMN IF NOT EXISTS ubicacion varchar(20) NOT NULL DEFAULT 'almacen';

ALTER TABLE inventario_presentaciones
  ADD COLUMN IF NOT EXISTS precio_venta integer NOT NULL DEFAULT 0;
ALTER TABLE inventario_presentaciones
  ADD COLUMN IF NOT EXISTS comision integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS inventario_movimientos (
  id varchar(36) PRIMARY KEY,
  tipo varchar(20) NOT NULL,
  producto_id varchar(36) DEFAULT NULL,
  presentacion_id varchar(36) DEFAULT NULL,
  cantidad integer NOT NULL DEFAULT 0,
  precio_venta integer DEFAULT NULL,
  comision integer DEFAULT NULL,
  usuario_id varchar(36) DEFAULT NULL,
  fecha_crea timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inventario_movimientos_producto
  ON inventario_movimientos (producto_id);
CREATE INDEX IF NOT EXISTS idx_inventario_movimientos_presentacion
  ON inventario_movimientos (presentacion_id);
