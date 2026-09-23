ALTER TABLE inventario_movimientos
  ADD COLUMN IF NOT EXISTS estado varchar(20) NOT NULL DEFAULT 'historica',
  ADD COLUMN IF NOT EXISTS aceptado_por varchar(36),
  ADD COLUMN IF NOT EXISTS fecha_aceptacion timestamp;

ALTER TABLE inventario_unidades
  ADD COLUMN IF NOT EXISTS transferencia_id varchar(36) REFERENCES inventario_movimientos(id);
CREATE INDEX IF NOT EXISTS idx_unidades_transferencia ON inventario_unidades(transferencia_id);
CREATE INDEX IF NOT EXISTS idx_transferencias_pendientes ON inventario_movimientos(estado, fecha_crea) WHERE tipo = 'traspaso';

INSERT INTO permissions (id, name, description, module, action, created_at, updated_at)
SELECT 'cb15bb20-559b-40f4-96c6-03bedf1a1201', 'Aceptar transferencias de barra',
  'Confirmar la recepción de productos enviados desde almacén al bar', 'products', 'accept_transfer', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE module = 'products' AND action = 'accept_transfer' AND deleted_at IS NULL);

INSERT INTO roles (id_rol, nombre, descripcion, estado, fecha_crea)
SELECT 'cb15bb20-559b-40f4-96c6-03bedf1a1202', 'Barman', 'Encargado de recibir y aceptar productos en barra', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE lower(nombre) = 'barman');

INSERT INTO role_permissions (id, role_id, permission_id, created_at)
SELECT gen_random_uuid()::text, r.id_rol, p.id, now()
FROM roles r CROSS JOIN permissions p
WHERE lower(r.nombre) = 'barman' AND p.module = 'products'
  AND p.action IN ('view', 'accept_transfer') AND p.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id_rol AND rp.permission_id = p.id);
