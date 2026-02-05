-- Agregar columna display_order a la tabla habitaciones
ALTER TABLE `habitaciones` 
ADD COLUMN `display_order` INT NOT NULL DEFAULT 0 AFTER `nombre`;

-- Inicializar display_order con valores secuenciales
UPDATE `habitaciones` 
SET `display_order` = `id_habitacion`
WHERE `display_order` = 0;

-- Crear índice para mejorar el rendimiento de las consultas por orden
CREATE INDEX idx_display_order ON `habitaciones`(`display_order`);
