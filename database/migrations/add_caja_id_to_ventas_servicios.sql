-- Migración: Agregar campo caja_id a las tablas ventas y servicios
-- Fecha: 2026-01-15
-- Descripción: Agrega el campo caja_id para relacionar ventas y servicios con la caja en la que se registraron

-- Agregar campo caja_id a la tabla ventas
ALTER TABLE `ventas` 
ADD COLUMN `caja_id` INT NULL AFTER `pedido_id`,
ADD INDEX `idx_ventas_caja_id` (`caja_id`),
ADD CONSTRAINT `fk_ventas_caja` 
  FOREIGN KEY (`caja_id`) 
  REFERENCES `cajas` (`id_caja`) 
  ON DELETE SET NULL 
  ON UPDATE CASCADE;

-- Agregar campo caja_id a la tabla servicios
ALTER TABLE `servicios` 
ADD COLUMN `caja_id` INT NULL AFTER `metodo_pago`,
ADD INDEX `idx_servicios_caja_id` (`caja_id`),
ADD CONSTRAINT `fk_servicios_caja` 
  FOREIGN KEY (`caja_id`) 
  REFERENCES `cajas` (`id_caja`) 
  ON DELETE SET NULL 
  ON UPDATE CASCADE;

-- Actualizar ventas existentes con la caja correspondiente basándose en la fecha
UPDATE ventas v
LEFT JOIN cajas c ON v.fecha_crea >= c.fecha_apertura 
  AND (c.fecha_cierre IS NULL OR v.fecha_crea <= c.fecha_cierre)
  AND c.estado IN (0, 1)
SET v.caja_id = c.id_caja
WHERE v.caja_id IS NULL;

-- Actualizar servicios existentes con la caja correspondiente basándose en la fecha
UPDATE servicios s
LEFT JOIN cajas c ON s.fecha_crea >= c.fecha_apertura 
  AND (c.fecha_cierre IS NULL OR s.fecha_crea <= c.fecha_cierre)
  AND c.estado IN (0, 1)
SET s.caja_id = c.id_caja
WHERE s.caja_id IS NULL;
