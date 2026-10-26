-- 106) Reparación de los permisos del módulo `entradas` -----------------------
-- La 097 crea los permisos de `entradas` y los reparte por rol, pero hay bases
-- restauradas desde un dump anterior en las que la migración figura como
-- aplicada y las filas de `permissions`/`role_permissions` no existen. En esas
-- bases el garzón recibe 403 "Permisos insuficientes" al listar o cobrar la
-- entrada. Esta migración los vuelve a dejar en su sitio y es idempotente: si
-- ya están, no toca nada.

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

-- Ver: los mismos roles que abren /tickets hoy.
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
