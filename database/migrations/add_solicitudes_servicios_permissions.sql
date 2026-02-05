-- Agregar permisos para aprobar y rechazar solicitudes de servicio
-- Fecha: 2026-02-05

-- Insertar permisos si no existen
INSERT INTO permissions (name, description, module, action) 
SELECT 'aprobar-solicitud-servicio', 'Aprobar solicitudes de servicio', 'solicitudes-servicios', 'aprobar'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'aprobar-solicitud-servicio');

INSERT INTO permissions (name, description, module, action) 
SELECT 'rechazar-solicitud-servicio', 'Rechazar solicitudes de servicio', 'solicitudes-servicios', 'rechazar'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'rechazar-solicitud-servicio');

-- Asignar permisos al rol de Administrador
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id_rol, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.nombre = 'Administrador'
  AND p.name IN ('aprobar-solicitud-servicio', 'rechazar-solicitud-servicio')
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id_rol AND rp.permission_id = p.id
  );

-- Asignar permisos al rol de Cajero
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id_rol, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.nombre = 'Cajero'
  AND p.name IN ('aprobar-solicitud-servicio', 'rechazar-solicitud-servicio')
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id_rol AND rp.permission_id = p.id
  );

-- Verificar los permisos creados
SELECT 
    r.nombre AS rol,
    p.name AS permiso,
    p.description AS descripcion,
    p.module AS modulo,
    p.action AS accion
FROM role_permissions rp
JOIN roles r ON r.id_rol = rp.role_id
JOIN permissions p ON p.id = rp.permission_id
WHERE p.name IN ('aprobar-solicitud-servicio', 'rechazar-solicitud-servicio')
ORDER BY r.nombre, p.name;

