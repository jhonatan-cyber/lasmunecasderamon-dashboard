-- Esquema de base de datos para el módulo de categorías

-- Tabla de categorías
CREATE TABLE IF NOT EXISTS categorias (
  id_categoria INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  estado TINYINT(1) DEFAULT 1 COMMENT '1: activa, 0: inactiva',
  fecha_crea TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_mod TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Índices para optimizar consultas
CREATE INDEX idx_categorias_estado ON categorias(estado);
CREATE INDEX idx_categorias_nombre ON categorias(nombre);
CREATE INDEX idx_categorias_fecha_crea ON categorias(fecha_crea);

-- Insertar categorías de ejemplo
INSERT IGNORE INTO categorias (nombre, descripcion, estado) VALUES 
('Bebidas', 'Bebidas alcohólicas y no alcohólicas', 1),
('Comidas', 'Platos principales y entradas', 1),
('Postres', 'Dulces y postres', 1),
('Servicios', 'Servicios especiales y eventos', 1),
('Accesorios', 'Accesorios y productos complementarios', 1),
('Promociones', 'Productos en promoción', 1),
('Temporada', 'Productos de temporada', 0);

-- Verificar que la tabla productos tenga la referencia a categorías
-- Si la tabla productos no tiene la columna categoria_id, agregarla:
-- ALTER TABLE productos ADD COLUMN categoria_id INT;
-- ALTER TABLE productos ADD FOREIGN KEY (categoria_id) REFERENCES categorias(id_categoria);