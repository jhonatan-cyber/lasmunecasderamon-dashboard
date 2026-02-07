-- Agregar campo comision a la tabla detalle_servicios
ALTER TABLE detalle_servicios 
ADD COLUMN comision decimal(10,2) NOT NULL DEFAULT 0 
AFTER usuario_id;
