-- 033) confirmación de recepción de envases en almacén (bar → almacén) --------
-- El control de envases es interno: el barman marca la entrega del envase
-- vacío (032) y el almacén confirma que lo recibió. La confirmación es un
-- segundo paso sobre la misma unidad, así que cada parte queda registrada por
-- separado: nadie puede dar por recibido un envase que el bar no entregó.
--
-- fecha_confirmacion: si no es NULL, el almacén ya recibió el envase. Solo se
-- escribe sobre unidades con fecha_devolucion (entrega marcada por el bar).
-- confirmado_por: quién verificó la recepción (patrón de 012 con aceptado_por).
-- Ambas columnas usan `timestamp` naivo, igual que fecha_crea/fecha_devolucion:
-- la aplicación escribe la hora del negocio con getNowInBusinessTimezone().
ALTER TABLE inventario_unidades
  ADD COLUMN IF NOT EXISTS fecha_confirmacion timestamp DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS confirmado_por varchar(36) DEFAULT NULL;

-- Permiso propio del almacén (patrón de 012 con accept_transfer): quien entrega
-- el envase no debe ser quien confirma la recepción, así que no se otorga al
-- barman. El administrador pasa siempre por isAdministrator.
INSERT INTO permissions (id, name, description, module, action, created_at, updated_at)
SELECT '7a4c1e58-2d63-4b19-9f04-6e2b7ac35d10', 'Confirmar recepción de envases',
  'Confirmar que el almacén recibió los envases vacíos entregados por el bar',
  'products', 'confirm_container_return', now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM permissions WHERE module = 'products' AND action = 'confirm_container_return' AND deleted_at IS NULL
);

-- Otorgamiento a los roles de almacén (cualquier nombre que lo describa) y al
-- administrador, para que el permiso aparezca en la pantalla de roles.
INSERT INTO role_permissions (id, role_id, permission_id, created_at)
SELECT gen_random_uuid()::text, r.id_rol, p.id, now()
FROM roles r CROSS JOIN permissions p
WHERE LOWER(r.nombre) IN ('almacen', 'almacén', 'almacenero', 'inventario', 'administrador')
  AND p.module = 'products' AND p.action = 'confirm_container_return' AND p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id_rol AND rp.permission_id = p.id
  );
