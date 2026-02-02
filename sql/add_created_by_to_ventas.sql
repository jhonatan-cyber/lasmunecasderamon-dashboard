-- Agregar columna created_by a la tabla ventas
-- Esta columna almacenará el ID del usuario que creó la venta

ALTER TABLE ventas 
ADD COLUMN created_by INT NULL,
ADD CONSTRAINT fk_ventas_created_by 
FOREIGN KEY (created_by) REFERENCES usuarios(id_usuario) 
ON DELETE SET NULL ON UPDATE CASCADE;

-- Crear índice para mejorar el rendimiento
CREATE INDEX idx_ventas_created_by ON ventas(created_by);

-- Comentario para documentar la columna
ALTER TABLE ventas MODIFY COLUMN created_by INT NULL COMMENT 'ID del usuario que creó la venta';