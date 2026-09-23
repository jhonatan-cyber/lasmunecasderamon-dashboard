-- 013) permisos del rol Barman ----------------------------------------------------
-- El sidebar del Barman muestra: Bar, Venta, Privados (+ Transferencia).
-- Replica el subset de venta del Cajero más la aprobación de traspasos.
INSERT INTO role_permissions (id, role_id, permission_id, created_at)
SELECT gen_random_uuid()::text, r.id_rol, p.id, now()
FROM roles r CROSS JOIN permissions p
WHERE LOWER(r.nombre) = 'barman'
  AND p.deleted_at IS NULL
  AND (
    (p.module = 'sales' AND p.action IN ('view', 'create'))
    OR (p.module = 'private_rooms' AND p.action IN ('view', 'create', 'finalize'))
    OR (p.module = 'dashboard' AND p.action = 'view')
  )
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id_rol AND rp.permission_id = p.id
  );
