-- Script para actualizar TODAS las Foreign Keys de CLIENTES con ON DELETE CASCADE
-- Este script permite eliminar clientes sin conflictos de restricción de clave foránea
-- Se encontraron 6 constraints que referencian a clientes

-- Elimina las constraints existentes (si existen)
ALTER TABLE cuentas DROP FOREIGN KEY IF EXISTS fk_cuentas_clientes;
ALTER TABLE devoluciones_servicios DROP FOREIGN KEY IF EXISTS fk_devoluciones_servicios_clientes;
ALTER TABLE devoluciones_ventas DROP FOREIGN KEY IF EXISTS fk_devoluciones_ventas_clientes;
ALTER TABLE pedidos DROP FOREIGN KEY IF EXISTS fk_pedidos_clientes;
ALTER TABLE servicios DROP FOREIGN KEY IF EXISTS fk_servicios_clientes;
ALTER TABLE ventas DROP FOREIGN KEY IF EXISTS fk_ventas_clientes;

-- Agrega las constraints con ON DELETE CASCADE ON UPDATE CASCADE
ALTER TABLE cuentas ADD CONSTRAINT fk_cuentas_clientes
  FOREIGN KEY (cliente_id) REFERENCES clientes(id_cliente) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE devoluciones_servicios ADD CONSTRAINT fk_devoluciones_servicios_clientes
  FOREIGN KEY (cliente_id) REFERENCES clientes(id_cliente) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE devoluciones_ventas ADD CONSTRAINT fk_devoluciones_ventas_clientes
  FOREIGN KEY (cliente_id) REFERENCES clientes(id_cliente) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE pedidos ADD CONSTRAINT fk_pedidos_clientes
  FOREIGN KEY (cliente_id) REFERENCES clientes(id_cliente) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE servicios ADD CONSTRAINT fk_servicios_clientes
  FOREIGN KEY (cliente_id) REFERENCES clientes(id_cliente) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE ventas ADD CONSTRAINT fk_ventas_clientes
  FOREIGN KEY (cliente_id) REFERENCES clientes(id_cliente) ON DELETE CASCADE ON UPDATE CASCADE;
