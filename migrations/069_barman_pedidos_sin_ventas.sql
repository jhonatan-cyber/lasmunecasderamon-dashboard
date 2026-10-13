-- El barman realiza pedidos; caja procesa las ventas.
DELETE FROM role_permissions rp
USING roles r, permissions p
WHERE rp.role_id = r.id_rol AND rp.permission_id = p.id
  AND LOWER(r.nombre) = 'barman'
  AND (p.module = 'sales' OR (p.module = 'orders' AND p.action = 'process'));

INSERT INTO role_permissions (id, role_id, permission_id, created_at)
SELECT gen_random_uuid()::text, r.id_rol, p.id, now()
FROM roles r CROSS JOIN permissions p
WHERE LOWER(r.nombre) = 'barman' AND p.deleted_at IS NULL
  AND p.module = 'orders' AND p.action IN ('view', 'create')
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id_rol AND rp.permission_id = p.id
  );
