-- Agregar campo num_clientes a la tabla solicitudes_servicios
ALTER TABLE solicitudes_servicios 
ADD COLUMN num_clientes int NOT NULL DEFAULT 1 
AFTER anfitrionas_ids;
