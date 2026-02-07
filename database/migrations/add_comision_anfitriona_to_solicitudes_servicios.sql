-- Agregar campo comision_anfitriona a la tabla solicitudes_servicios
ALTER TABLE solicitudes_servicios 
ADD COLUMN comision_anfitriona decimal(10,2) NOT NULL DEFAULT 0 
AFTER precio_habitacion;
