-- Script para actualizar TODAS las Foreign Keys de PEDIDOS con ON DELETE CASCADE
-- Este script permite eliminar pedidos sin conflictos de restricción de clave foránea
-- Se encontraron 2 constraints que referencian a pedidos

-- Elimina las constraints existentes (si existen)
ALTER TABLE detalle_pedidos DROP FOREIGN KEY IF EXISTS fk_detalle_pedidos_pedidos;
ALTER TABLE pedidos_usuarios DROP FOREIGN KEY IF EXISTS fk_pedidos_usuarios_pedidos;

-- Agrega las constraints con ON DELETE CASCADE ON UPDATE CASCADE
ALTER TABLE detalle_pedidos ADD CONSTRAINT fk_detalle_pedidos_pedidos
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id_pedido) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE pedidos_usuarios ADD CONSTRAINT fk_pedidos_usuarios_pedidos
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id_pedido) ON DELETE CASCADE ON UPDATE CASCADE;
