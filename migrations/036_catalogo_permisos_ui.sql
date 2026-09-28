-- 036) Alinear el catálogo de permisos con lo que pide la UI ------------------
-- La UI consulta pares módulo/acción contra este catálogo (`hasPermission(módulo,
-- acción)` en el contexto de sesión y `<PermissionGuard>` en los controles). Si el
-- par no existe acá, ningún rol puede satisfacerlo: el control queda invisible para
-- todos los no-administradores y el administrador no tiene forma de concederlo desde
-- el panel de Roles.
--
-- Faltaban tres familias, todas con el mismo vocabulario que ya usaba el frontend:
--   * `view_details` — existe desde el inicio para `clients` y `gratificaciones`;
--     la UI lo pide además para usuarios, asistencias, caja, comisiones, ventas y propinas.
--   * `activate` / `deactivate` — existen para `users` y `roles`; la UI los pide
--     también para categorías, productos y habitaciones.
--   * `occupy` / `liberate` — operaciones propias de una habitación (mismo criterio
--     que `private_rooms.finalize`).
--
-- No se agregan alias en español: el catálogo es el vocabulario canónico y los
-- llamados del frontend se corrigieron para pedir estos pares.
--
-- No cambia el acceso de ningún rol: hoy estos pares no se pueden satisfacer, así que
-- el administrador los concede explícitamente. Se siembran solo en Administrador, que
-- ya tiene el resto del catálogo (el resto de roles conserva exactamente su matriz).
INSERT INTO permissions (id, name, description, module, action, created_at, updated_at)
SELECT '53772de0-2287-48bf-ad32-ce1fb800924e', 'Ver detalles de usuarios',
  'Acceso para ver la información detallada de un usuario', 'users', 'view_details', now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM permissions WHERE module = 'users' AND action = 'view_details' AND deleted_at IS NULL
);

INSERT INTO permissions (id, name, description, module, action, created_at, updated_at)
SELECT 'ea35ddb9-458a-4ea0-ad75-4b3583cecc62', 'Ver detalles de asistencias',
  'Acceso para ver el detalle de una asistencia', 'attendance', 'view_details', now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM permissions WHERE module = 'attendance' AND action = 'view_details' AND deleted_at IS NULL
);

INSERT INTO permissions (id, name, description, module, action, created_at, updated_at)
SELECT '50c56cf1-6d96-4c14-a490-c86c8d1c7f66', 'Ver detalles de caja',
  'Acceso para ver el detalle de un movimiento de caja', 'cash_register', 'view_details', now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM permissions WHERE module = 'cash_register' AND action = 'view_details' AND deleted_at IS NULL
);

INSERT INTO permissions (id, name, description, module, action, created_at, updated_at)
SELECT '4190ec62-f3cf-4e07-89dd-3ff259079c90', 'Ver detalles de comisiones',
  'Acceso para ver el detalle de una comisión', 'commissions', 'view_details', now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM permissions WHERE module = 'commissions' AND action = 'view_details' AND deleted_at IS NULL
);

INSERT INTO permissions (id, name, description, module, action, created_at, updated_at)
SELECT '7e92b3b8-b54e-442f-ae33-3ec4ca3d006c', 'Ver detalles de ventas',
  'Acceso para ver el detalle de una venta', 'sales', 'view_details', now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM permissions WHERE module = 'sales' AND action = 'view_details' AND deleted_at IS NULL
);

INSERT INTO permissions (id, name, description, module, action, created_at, updated_at)
SELECT 'f0ea5fb7-d8d0-443f-8cbb-ed8a281e15c5', 'Ver detalles de propinas',
  'Acceso para ver el detalle de una propina', 'tips', 'view_details', now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM permissions WHERE module = 'tips' AND action = 'view_details' AND deleted_at IS NULL
);

INSERT INTO permissions (id, name, description, module, action, created_at, updated_at)
SELECT 'aaad3148-09d5-4a55-b755-f6b1a5f1011e', 'Activar categorías',
  'Acceso para volver a activar una categoría desactivada', 'categories', 'activate', now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM permissions WHERE module = 'categories' AND action = 'activate' AND deleted_at IS NULL
);

INSERT INTO permissions (id, name, description, module, action, created_at, updated_at)
SELECT 'd75e6644-ec27-4d11-ac05-cb081b4d9c26', 'Desactivar categorías',
  'Acceso para desactivar una categoría sin eliminarla', 'categories', 'deactivate', now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM permissions WHERE module = 'categories' AND action = 'deactivate' AND deleted_at IS NULL
);

INSERT INTO permissions (id, name, description, module, action, created_at, updated_at)
SELECT 'aae71311-97ef-4ff8-9861-b131046d211e', 'Activar productos',
  'Acceso para volver a activar un producto desactivado', 'products', 'activate', now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM permissions WHERE module = 'products' AND action = 'activate' AND deleted_at IS NULL
);

INSERT INTO permissions (id, name, description, module, action, created_at, updated_at)
SELECT '2509928a-0298-4be4-8654-a4fbb14c141d', 'Desactivar productos',
  'Acceso para desactivar un producto sin eliminarlo', 'products', 'deactivate', now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM permissions WHERE module = 'products' AND action = 'deactivate' AND deleted_at IS NULL
);

INSERT INTO permissions (id, name, description, module, action, created_at, updated_at)
SELECT 'abc3223d-3fc2-44fa-9fe4-3a20c533ea62', 'Activar habitaciones',
  'Acceso para volver a habilitar una habitación', 'rooms', 'activate', now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM permissions WHERE module = 'rooms' AND action = 'activate' AND deleted_at IS NULL
);

INSERT INTO permissions (id, name, description, module, action, created_at, updated_at)
SELECT 'b84e57b2-10a8-4c48-8a0d-4b4b32a0a515', 'Desactivar habitaciones',
  'Acceso para deshabilitar una habitación sin eliminarla', 'rooms', 'deactivate', now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM permissions WHERE module = 'rooms' AND action = 'deactivate' AND deleted_at IS NULL
);

INSERT INTO permissions (id, name, description, module, action, created_at, updated_at)
SELECT '130b8dfd-3bfa-42ce-86ac-77b9efa1fd95', 'Ocupar habitaciones',
  'Acceso para marcar una habitación como ocupada', 'rooms', 'occupy', now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM permissions WHERE module = 'rooms' AND action = 'occupy' AND deleted_at IS NULL
);

INSERT INTO permissions (id, name, description, module, action, created_at, updated_at)
SELECT '9639f106-3bd8-48ac-9bc2-989ac54b8821', 'Liberar habitaciones',
  'Acceso para liberar una habitación ocupada', 'rooms', 'liberate', now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM permissions WHERE module = 'rooms' AND action = 'liberate' AND deleted_at IS NULL
);

-- La UI del calendario de planilla pedía un módulo `payroll_details` que nunca
-- existió en el catálogo (ni en la matriz de flags), así que la página quedaba
-- inaccesible para todo rol que no fuera administrador. El detalle de la planilla
-- es un `view_details` de `payroll`, como clients/gratificaciones.
INSERT INTO permissions (id, name, description, module, action, created_at, updated_at)
SELECT '74706556-8dad-4dc8-b737-06ae6596e7ff', 'Ver detalles de planilla',
  'Acceso para ver el detalle de la planilla de un trabajador', 'payroll', 'view_details', now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM permissions WHERE module = 'payroll' AND action = 'view_details' AND deleted_at IS NULL
);

-- Siembra de las filas nuevas en Administrador (patrón de 032/033).
INSERT INTO role_permissions (id, role_id, permission_id, created_at)
SELECT gen_random_uuid()::text, r.id_rol, p.id, now()
FROM roles r
CROSS JOIN (
  VALUES
    ('users', 'view_details'),
    ('attendance', 'view_details'),
    ('cash_register', 'view_details'),
    ('commissions', 'view_details'),
    ('sales', 'view_details'),
    ('tips', 'view_details'),
    ('categories', 'activate'),
    ('categories', 'deactivate'),
    ('products', 'activate'),
    ('products', 'deactivate'),
    ('rooms', 'activate'),
    ('rooms', 'deactivate'),
    ('rooms', 'occupy'),
    ('rooms', 'liberate'),
    ('payroll', 'view_details')
) AS nuevo(module, action)
JOIN permissions p
  ON p.module = nuevo.module AND p.action = nuevo.action AND p.deleted_at IS NULL
WHERE LOWER(r.nombre) = 'administrador'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id_rol AND rp.permission_id = p.id
  );
