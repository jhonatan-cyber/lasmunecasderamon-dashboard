-- 097) Solicitud de cortesía en la puerta y entrega en la barra ---------------
-- El garzón cobra en la puerta pero el dinero no se postea a la caja ahí: el
-- precio de la entrada pertenece a la cubeta que decide el cliente en la barra.
--   * cortesía  → movimiento de caja (entradas);
--   * upgrade   → una venta por el precio de lista de la bebida (ventas).
-- `cortesia_estado` modela ese tránsito: la fila nace 'pendiente' y se cierra
-- 'entregada' (servida) o 'anulada' (el cliente no volvió; el barrido del cierre
-- de caja postea el dinero como entrada).
--
-- El default es 'entregada' para no reescribir el histórico: las filas
-- anteriores a esta migración ya consumieron su stock y ya cobraron su caja.
ALTER TABLE entradas_clientes
  ADD COLUMN IF NOT EXISTS cortesia_estado varchar(20) NOT NULL DEFAULT 'entregada',
  ADD COLUMN IF NOT EXISTS cortesia_entregada_por varchar(36) REFERENCES usuarios(id_usuario),
  ADD COLUMN IF NOT EXISTS cortesia_entregada_at timestamp;

ALTER TABLE entradas_clientes
  DROP CONSTRAINT IF EXISTS entradas_clientes_cortesia_estado_check,
  ADD CONSTRAINT entradas_clientes_cortesia_estado_check
    CHECK (cortesia_estado IN ('pendiente', 'entregada', 'anulada'));

-- La cola del bar sólo mira pendientes: el índice parcial evita escanear el
-- histórico del día.
CREATE INDEX IF NOT EXISTS idx_entradas_clientes_pendientes
  ON entradas_clientes (fecha DESC, hora DESC)
  WHERE cortesia_estado = 'pendiente';

-- 097) Permisos del módulo `entradas` ----------------------------------------
-- Hasta ahora la pantalla y la API se gateaban con `products.*`, que mezcla dos
-- conceptos: el inventario y el cobro de la puerta. El módulo propio separa
-- registrar (garzón/cajero) de entregar en la barra (barman/garzón).
INSERT INTO permissions (id, name, description, module, action, created_at, updated_at)
SELECT '7c1e5d20-4b6a-4f3e-9a11-0d5f6b7c8e01', 'Ver entradas',
  'Acceso al listado de entradas de clientes', 'entradas', 'view', now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM permissions WHERE module = 'entradas' AND action = 'view' AND deleted_at IS NULL
);

INSERT INTO permissions (id, name, description, module, action, created_at, updated_at)
SELECT '7c1e5d20-4b6a-4f3e-9a11-0d5f6b7c8e02', 'Registrar entradas',
  'Cobrar la entrada en la puerta y dejar la cortesía pendiente', 'entradas', 'create', now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM permissions WHERE module = 'entradas' AND action = 'create' AND deleted_at IS NULL
);

INSERT INTO permissions (id, name, description, module, action, created_at, updated_at)
SELECT '7c1e5d20-4b6a-4f3e-9a11-0d5f6b7c8e03', 'Entregar cortesías',
  'Entregar en la barra la bebida de una entrada (cortesía o adicional)', 'entradas', 'deliver', now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM permissions WHERE module = 'entradas' AND action = 'deliver' AND deleted_at IS NULL
);

-- Ver: los mismos roles que hoy ven /tickets con products.view.
INSERT INTO role_permissions (id, role_id, permission_id, created_at)
SELECT gen_random_uuid()::text, r.id_rol, p.id, now()
FROM roles r CROSS JOIN permissions p
WHERE LOWER(r.nombre) IN ('administrador', 'cajero', 'garzon', 'barman')
  AND p.module = 'entradas' AND p.action = 'view' AND p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id_rol AND rp.permission_id = p.id
  );

-- Registrar: quien cobra en la puerta. El barman vende en la barra, no cobra entradas.
INSERT INTO role_permissions (id, role_id, permission_id, created_at)
SELECT gen_random_uuid()::text, r.id_rol, p.id, now()
FROM roles r CROSS JOIN permissions p
WHERE LOWER(r.nombre) IN ('administrador', 'cajero', 'garzon')
  AND p.module = 'entradas' AND p.action = 'create' AND p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id_rol AND rp.permission_id = p.id
  );

-- Entregar: la barra. El cajero no sirve bebidas.
INSERT INTO role_permissions (id, role_id, permission_id, created_at)
SELECT gen_random_uuid()::text, r.id_rol, p.id, now()
FROM roles r CROSS JOIN permissions p
WHERE LOWER(r.nombre) IN ('administrador', 'barman', 'garzon')
  AND p.module = 'entradas' AND p.action = 'deliver' AND p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id_rol AND rp.permission_id = p.id
  );
