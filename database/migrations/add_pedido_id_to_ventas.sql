-- Agregar columna pedido_id a la tabla ventas
-- Esta columna permite rastrear de qué pedido proviene una venta

ALTER TABLE ventas 
ADD COLUMN pedido_id INT NULL AFTER cliente_id,
ADD CONSTRAINT fk_ventas_pedidos 
  FOREIGN KEY (pedido_id) 
  REFERENCES pedidos(id_pedido) 
  ON DELETE SET NULL 
  ON UPDATE CASCADE;

-- Crear índice para mejorar el rendimiento de las consultas
CREATE INDEX idx_ventas_pedido_id ON ventas(pedido_id);
