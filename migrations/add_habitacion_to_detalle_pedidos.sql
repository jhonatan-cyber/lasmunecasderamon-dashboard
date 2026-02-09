-- Agregar columna habitacion_id a la tabla detalle_pedidos
-- Esta columna almacena la habitación asignada a productos con precio >= 30000 y comisión

-- Verificar si la columna ya existe antes de agregarla
ALTER TABLE detalle_pedidos 
ADD COLUMN IF NOT EXISTS habitacion_id INT NULL 
AFTER hostess_id;

-- Agregar índice para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_detalle_pedidos_habitacion 
ON detalle_pedidos(habitacion_id);

-- Agregar clave foránea para mantener integridad referencial
ALTER TABLE detalle_pedidos 
ADD CONSTRAINT fk_detalle_pedidos_habitacion 
FOREIGN KEY (habitacion_id) REFERENCES habitaciones(id_habitacion) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- Comentario sobre la columna
ALTER TABLE detalle_pedidos 
MODIFY COLUMN habitacion_id INT NULL 
COMMENT 'ID de la habitación asignada para productos con precio >= 30000 y comisión';
