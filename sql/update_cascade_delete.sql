-- Script para actualizar TODAS las Foreign Keys con ON DELETE CASCADE
-- Este script permite eliminar usuarios sin conflictos de restricción de clave foránea
-- Se encontraron 15 constraints que referencian a usuarios

-- Elimina las constraints existentes (si existen)
ALTER TABLE anticipos DROP FOREIGN KEY IF EXISTS fk_anticipos_usuarios;
ALTER TABLE asistencias DROP FOREIGN KEY IF EXISTS fk_asistencia_usuarios;
ALTER TABLE cajas DROP FOREIGN KEY IF EXISTS fk_cajas_usuario_apertura;
ALTER TABLE cajas DROP FOREIGN KEY IF EXISTS fk_cajas_usuario_cierre;
ALTER TABLE cuentas_usuarios DROP FOREIGN KEY IF EXISTS fk_cuentas_usuarios_usuarios;
ALTER TABLE detalle_comisiones DROP FOREIGN KEY IF EXISTS fk_detalle_comisiones_usuarios;
ALTER TABLE detalle_devoluciones_servicios DROP FOREIGN KEY IF EXISTS fk_detalle_devoluciones_servicios_usuarios;
ALTER TABLE detalle_propinas DROP FOREIGN KEY IF EXISTS fk_detalle_propinas_usuarios;
ALTER TABLE detalle_servicios DROP FOREIGN KEY IF EXISTS fk_detalle_servicios_usuarios;
ALTER TABLE devoluciones_ventas_usuarios DROP FOREIGN KEY IF EXISTS fk_devoluciones_ventas_usuarios_usuarios;
ALTER TABLE logins DROP FOREIGN KEY IF EXISTS fk_logins_usuarios;
ALTER TABLE pedidos DROP FOREIGN KEY IF EXISTS fk_pedidos_usuarios_mesero;
ALTER TABLE pedidos_usuarios DROP FOREIGN KEY IF EXISTS fk_pedidos_usuarios_usuarios;
ALTER TABLE retiros_caja DROP FOREIGN KEY IF EXISTS fk_retiros_usuario;
ALTER TABLE ventas_usuarios DROP FOREIGN KEY IF EXISTS fk_ventas_usuario_usuarios;

-- Agrega las constraints con ON DELETE CASCADE ON UPDATE CASCADE
ALTER TABLE anticipos ADD CONSTRAINT fk_anticipos_usuarios
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE asistencias ADD CONSTRAINT fk_asistencia_usuarios
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE cajas ADD CONSTRAINT fk_cajas_usuario_apertura
  FOREIGN KEY (usuario_id_apertura) REFERENCES usuarios(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE cajas ADD CONSTRAINT fk_cajas_usuario_cierre
  FOREIGN KEY (usuario_id_cierre) REFERENCES usuarios(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE cuentas_usuarios ADD CONSTRAINT fk_cuentas_usuarios_usuarios
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE detalle_comisiones ADD CONSTRAINT fk_detalle_comisiones_usuarios
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE detalle_devoluciones_servicios ADD CONSTRAINT fk_detalle_devoluciones_servicios_usuarios
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE detalle_propinas ADD CONSTRAINT fk_detalle_propinas_usuarios
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE detalle_servicios ADD CONSTRAINT fk_detalle_servicios_usuarios
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE devoluciones_ventas_usuarios ADD CONSTRAINT fk_devoluciones_ventas_usuarios_usuarios
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE logins ADD CONSTRAINT fk_logins_usuarios
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE pedidos ADD CONSTRAINT fk_pedidos_usuarios_mesero
  FOREIGN KEY (mesero_id) REFERENCES usuarios(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE pedidos_usuarios ADD CONSTRAINT fk_pedidos_usuarios_usuarios
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE retiros_caja ADD CONSTRAINT fk_retiros_usuario
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE ventas_usuarios ADD CONSTRAINT fk_ventas_usuario_usuarios
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE;
