-- Agregar columna hostess_id a detalle_pedidos para asignar anfitriona por producto
ALTER TABLE detalle_pedidos 
ADD COLUMN hostess_id INT NULL AFTER genera_comision,
ADD CONSTRAINT fk_detalle_pedidos_hostess 
  FOREIGN KEY (hostess_id) REFERENCES usuarios(id_usuario) 
  ON DELETE SET NULL;

-- Agregar columna hostess_id a detalle_ventas para asignar anfitriona por producto
ALTER TABLE detalle_ventas 
ADD COLUMN hostess_id INT NULL AFTER comision,
ADD CONSTRAINT fk_detalle_ventas_hostess 
  FOREIGN KEY (hostess_id) REFERENCES usuarios(id_usuario) 
  ON DELETE SET NULL;
