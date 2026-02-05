-- Agregar columna display_order a la tabla productos
ALTER TABLE `productos` 
ADD COLUMN `display_order` INT NOT NULL DEFAULT 0 AFTER `categoria_id`;

-- Inicializar display_order con valores secuenciales para cada categoría
SET @row_number = 0;
SET @current_category = NULL;

UPDATE `productos` p
JOIN (
    SELECT 
        id_producto,
        @row_number := IF(@current_category = categoria_id, @row_number + 1, 1) AS new_order,
        @current_category := categoria_id
    FROM `productos`
    ORDER BY categoria_id, id_producto
) AS numbered ON p.id_producto = numbered.id_producto
SET p.display_order = numbered.new_order;

-- Crear índice para mejorar el rendimiento de las consultas por categoría y orden
CREATE INDEX idx_categoria_display_order ON `productos`(categoria_id, display_order);
