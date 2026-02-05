-- Agregar columna display_order a la tabla categorias
ALTER TABLE categorias ADD COLUMN display_order INT DEFAULT 0;

-- Inicializar el display_order basado en el id existente
UPDATE categorias SET display_order = id_categoria * 10;

-- Crear índice para mejorar el rendimiento de consultas ordenadas
CREATE INDEX idx_categorias_display_order ON categorias(display_order);
