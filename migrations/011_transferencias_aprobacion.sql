-- 011) aprobación de traspasos por el bar ---------------------------------------
-- Todo traspaso nace como solicitud pendiente en inventario_movimientos:
-- las unidades quedan en tránsito (no disponibles en almacén ni visibles
-- en bar) hasta que el encargado del bar (rol Barman) la aprueba o rechaza.
-- El historial registra quién solicita (usuario_id) y quién acepta
-- (aceptado_por). Las opciones_venta guardan el desglose de precios
-- (botella, copa, etc.) vigente al momento del traspaso.
ALTER TABLE inventario_movimientos
  ADD COLUMN IF NOT EXISTS estado varchar(20) NOT NULL DEFAULT 'pendiente';
ALTER TABLE inventario_movimientos
  ADD COLUMN IF NOT EXISTS opciones_venta text DEFAULT NULL;
ALTER TABLE inventario_movimientos
  ADD COLUMN IF NOT EXISTS aceptado_por varchar(36) DEFAULT NULL;
ALTER TABLE inventario_movimientos
  ADD COLUMN IF NOT EXISTS fecha_aceptacion timestamp DEFAULT NULL;
ALTER TABLE inventario_movimientos
  ADD COLUMN IF NOT EXISTS solicitado_por varchar(36) DEFAULT NULL;
ALTER TABLE inventario_movimientos
  ADD COLUMN IF NOT EXISTS aprobado_por varchar(36) DEFAULT NULL;

ALTER TABLE inventario_presentaciones
  ADD COLUMN IF NOT EXISTS opciones_venta text DEFAULT NULL;

INSERT INTO roles (id_rol, nombre, descripcion, estado, fecha_crea)
SELECT '9f3b1c2d-4a5e-4f6b-8c7d-0000000000b1', 'Barman', 'Encargado del bar: aprueba traspasos desde almacén', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE LOWER(nombre) = 'barman');
