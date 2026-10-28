-- 108) La caja también entrega las cortesías ---------------------------------
-- El cajero opera la barra cuando el barman no está en el turno: necesita
-- `entradas.deliver` para ver la cola de pendientes y entregar la bebida
-- (cortesía o adicional) desde el dashboard y desde la app.
--
-- La 097 dejó ese permiso sólo a administración, barman y garzón; esta
-- migración lo agrega a caja sin quitar nada. Es idempotente: si la base ya
-- tiene la fila (o el permiso no existe), no toca nada.
INSERT INTO role_permissions (id, role_id, permission_id, created_at)
SELECT gen_random_uuid()::text, r.id_rol, p.id, now()
FROM roles r CROSS JOIN permissions p
WHERE LOWER(r.nombre) = 'cajero'
  AND p.module = 'entradas' AND p.action = 'deliver' AND p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id_rol AND rp.permission_id = p.id
  );
