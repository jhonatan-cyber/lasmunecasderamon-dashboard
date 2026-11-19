-- 121) El barman entrega las colaciones ----------------------------------------
-- La colación es un corto por turno y quien lo entrega es el barman, no caja.
-- Permiso propio (patrón de 032 con return_container): products.write le
-- abriría al barman la edición de productos, que no le corresponde.
--
-- Idempotente: si el permiso o el rol no existen, no toca nada.
--
-- Después de aplicarla hay que invalidar la caché de permisos (60 s). Con Redis
-- en marcha, como administrador: `POST /api/permissions/invalidate-cache`.

INSERT INTO permissions (id, name, description, module, action, created_at, updated_at)
SELECT 'c4e1b2a3-8f57-4d6e-9b0c-1a2d3e4f5a6b', 'Registrar colaciones',
  'Entregar el corto por turno de un trabajador desde la barra',
  'products', 'register_colacion', now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM permissions WHERE module = 'products' AND action = 'register_colacion' AND deleted_at IS NULL
);

INSERT INTO role_permissions (id, role_id, permission_id, created_at)
SELECT gen_random_uuid()::text, r.id_rol, p.id, now()
FROM roles r CROSS JOIN permissions p
WHERE LOWER(r.nombre) = 'barman'
  AND p.module = 'products' AND p.action = 'register_colacion' AND p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id_rol AND rp.permission_id = p.id
  );
