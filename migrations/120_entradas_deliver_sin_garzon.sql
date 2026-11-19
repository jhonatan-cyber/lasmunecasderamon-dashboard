-- 120) El garzón no sirve ni entrega covers ------------------------------------
-- Quien entrega la bebida en la barra es el barman; las solicitudes las
-- responden caja y administración. La 097/106 habían concedido
-- `entradas.deliver` al garzón. Se retira ese permiso; conserva `entradas.view`
-- y `entradas.create` para consultar y cobrar entradas en la puerta.
--
-- Después de aplicarla hay que invalidar la caché de permisos: los procesos
-- pueden servir la matriz vieja hasta 60 s. Con Redis en marcha, como
-- administrador: `POST /api/permissions/invalidate-cache`.
--
-- Idempotente: si el rol o el permiso no existen, no toca nada.

DELETE FROM role_permissions rp
USING roles r, permissions p
WHERE rp.role_id = r.id_rol AND rp.permission_id = p.id
  AND LOWER(r.nombre) = 'garzon'
  AND p.module = 'entradas' AND p.action = 'deliver';
