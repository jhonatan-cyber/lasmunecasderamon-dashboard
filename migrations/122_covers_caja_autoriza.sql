-- 122) La caja autoriza los covers; la barra los entrega ----------------------
-- La 108 le dio `entradas.deliver` a la caja para que operara la barra cuando
-- no había barman. La regla cambió: caja solo responde las solicitudes del
-- barman (aprobar o rechazar) y nunca entrega la bebida. Para que pueda
-- hacerlo sin el permiso de entrega se crea `entradas.authorize_cover` y se
-- retira `entradas.deliver` de cajero/cajera.
--
-- Después de aplicarla hay que invalidar la caché de permisos: los procesos
-- pueden servir la matriz vieja hasta 60 s. Con Redis en marcha, como
-- administrador: `POST /api/permissions/invalidate-cache`.
--
-- Idempotente: si el rol o el permiso no existen, no toca nada.

INSERT INTO permissions (id, name, description, module, action, created_at, updated_at)
SELECT 'e6a3d4c5-0b79-4f81-9d2e-3c4f5a6b7d8e', 'Autorizar covers',
  'Aprobar o rechazar las solicitudes de covers que envía el barman',
  'entradas', 'authorize_cover', now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM permissions WHERE module = 'entradas' AND action = 'authorize_cover' AND deleted_at IS NULL
);

INSERT INTO role_permissions (id, role_id, permission_id, created_at)
SELECT gen_random_uuid()::text, r.id_rol, p.id, now()
FROM roles r CROSS JOIN permissions p
WHERE LOWER(r.nombre) IN ('administrador', 'cajero', 'cajera')
  AND p.module = 'entradas' AND p.action = 'authorize_cover' AND p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id_rol AND rp.permission_id = p.id
  );

-- Entregar sigue siendo de la barra (097/106); la 108 ya no aplica a caja.
DELETE FROM role_permissions rp
USING roles r, permissions p
WHERE rp.role_id = r.id_rol AND rp.permission_id = p.id
  AND LOWER(r.nombre) IN ('cajero', 'cajera')
  AND p.module = 'entradas' AND p.action = 'deliver';
