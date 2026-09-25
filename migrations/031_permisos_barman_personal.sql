-- 031) permisos del rol Barman: personal ----------------------------------------
-- Da acceso a las 4 vistas propias del barman en la app Expo (tabs de asistencia,
-- anticipos, propinas y horas extras). El resto de sus permisos (sales, products,
-- private_rooms, cash_register, dashboard) ya lo dieron 012/013/015/027.
-- Patrón idempotente de 013/015: INSERT ... SELECT con NOT EXISTS.
INSERT INTO role_permissions (id, role_id, permission_id, created_at)
SELECT gen_random_uuid()::text, r.id_rol, p.id, now()
FROM roles r CROSS JOIN permissions p
WHERE LOWER(r.nombre) = 'barman'
  AND p.deleted_at IS NULL
  AND (
    (p.module = 'attendance' AND p.action IN ('view', 'create'))
    OR (p.module = 'overtime' AND p.action IN ('view', 'create'))
    OR (p.module = 'tips' AND p.action = 'view')
    OR (p.module = 'advances' AND p.action IN ('view', 'create'))
  )
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id_rol AND rp.permission_id = p.id
  );
