-- 109) Reparación de los permisos de `orders` para quien envía pedidos --------
-- La app móvil del garzón (y la barra) crean pedidos con `POST /api/orders`, que
-- exige `orders.write` en la matriz; ese flag solo lo conceden los pares
-- `orders.create` / `orders.edit` del catálogo. En bases restauradas de un dump
-- anterior —o donde la matriz del rol se guardó sin esos pares— el rol conserva
-- el acceso a la pantalla de pedidos pero el envío devuelve 403 "Permisos
-- insuficientes". Lo mismo pasa con la sincronización de pedidos guardados en el
-- dispositivo: cada reintento vuelve a recibir el mismo 403.
--
-- Esta migración vuelve a dejar los pares en su sitio y los asigna a los roles
-- que crean pedidos (administrador, garzón, cajero —rol de caja— y barman, ver
-- 069). Es idempotente: si ya están, no toca nada.
--
-- Después de aplicarla hay que invalidar la caché de permisos, porque los
-- procesos pueden seguir sirviendo la matriz vieja hasta 60s (TTL). Con Redis en
-- marcha basta `POST /api/permissions/invalidate-cache` como administrador, que
-- además avisa a los clientes por SSE; sin Redis, la caché en memoria de cada
-- proceso caduca sola en ese minuto.

INSERT INTO permissions (id, name, description, module, action, created_at, updated_at)
SELECT '9b742701-f143-481a-8efb-5f80df07d5c8', 'Ver pedidos',
  'Acceso para visualizar todos los pedidos', 'orders', 'view', now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM permissions WHERE module = 'orders' AND action = 'view' AND deleted_at IS NULL
);

INSERT INTO permissions (id, name, description, module, action, created_at, updated_at)
SELECT '50e30209-2afc-445c-ba21-0f5a0e7d82c3', 'Crear pedidos',
  'Acceso para crear nuevos pedidos en el sistema', 'orders', 'create', now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM permissions WHERE module = 'orders' AND action = 'create' AND deleted_at IS NULL
);

-- Ver: los mismos roles que abren la pantalla de pedidos.
INSERT INTO role_permissions (id, role_id, permission_id, created_at)
SELECT gen_random_uuid()::text, r.id_rol, p.id, now()
FROM roles r CROSS JOIN permissions p
WHERE LOWER(r.nombre) IN ('administrador', 'garzon', 'cajero', 'barman')
  AND p.module = 'orders' AND p.action = 'view' AND p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id_rol AND rp.permission_id = p.id
  );

-- Crear: quien puede mandar un pedido desde la app o desde el dashboard.
INSERT INTO role_permissions (id, role_id, permission_id, created_at)
SELECT gen_random_uuid()::text, r.id_rol, p.id, now()
FROM roles r CROSS JOIN permissions p
WHERE LOWER(r.nombre) IN ('administrador', 'garzon', 'cajero', 'barman')
  AND p.module = 'orders' AND p.action = 'create' AND p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id_rol AND rp.permission_id = p.id
  );
