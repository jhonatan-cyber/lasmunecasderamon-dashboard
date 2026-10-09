-- 065) La caja puede verificar y aprobar la recepción de envases entregados.
-- El permiso sigue siendo distinto de `return_container`, que conserva el bar.
INSERT INTO role_permissions (id, role_id, permission_id, created_at)
SELECT gen_random_uuid()::text, r.id_rol, p.id, now()
FROM roles r
CROSS JOIN permissions p
WHERE LOWER(r.nombre) IN ('cajero', 'administrador')
  AND p.module = 'products'
  AND p.action = 'confirm_container_return'
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM role_permissions rp
    WHERE rp.role_id = r.id_rol AND rp.permission_id = p.id
  );
