ALTER TABLE inventario_presentaciones ADD COLUMN stock_minimo integer;
ALTER TABLE inventario_presentaciones ADD COLUMN stock_maximo integer;
ALTER TABLE inventario_presentaciones ADD CONSTRAINT presentaciones_limites_stock CHECK (
  (stock_minimo IS NULL AND stock_maximo IS NULL) OR
  (stock_minimo IS NOT NULL AND stock_maximo IS NOT NULL AND stock_minimo > 0 AND stock_maximo >= stock_minimo)
);
CREATE TABLE ordenes_reposicion (
  id varchar(36) PRIMARY KEY,
  presentacion_id varchar(36) NOT NULL REFERENCES inventario_presentaciones(id) ON DELETE CASCADE,
  cantidad integer NOT NULL CHECK (cantidad > 0),
  stock_actual integer NOT NULL CHECK (stock_actual >= 0),
  stock_maximo integer NOT NULL,
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'resuelta')),
  fecha_crea timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_mod timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX orden_reposicion_pendiente ON ordenes_reposicion(presentacion_id) WHERE estado = 'pendiente';
