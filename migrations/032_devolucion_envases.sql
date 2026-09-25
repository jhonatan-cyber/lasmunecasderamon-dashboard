-- 032) control de devolución de envases vacíos (bar → almacén) ----------------
-- El bar escanea un envase vacío antes de entregarlo al almacén y el sistema
-- lo contrasta con el código que él mismo generó (inventario_unidades): EAN-13
-- interno 29… o SKU LM-…. Solo si el envase es nuestro, está vacío ('vendida')
-- y todavía no se devolvió, queda marcado con fecha_devolucion.
--
-- fecha_devolucion: si no es NULL, el envase ya fue verificado y entregado. La
-- marca es la que hace fallar el re-escaneo y alimenta la lista de devoluciones;
-- no se crean movimientos de inventario porque la botella ya salió con la venta.
-- devuelto_por: quién verificó el escaneo (patrón de 012 con aceptado_por).
-- Ambas columnas usan `timestamp` naivo, igual que fecha_crea/fecha_aceptacion:
-- la aplicación escribe la hora del negocio con getNowInBusinessTimezone().
ALTER TABLE inventario_unidades
  ADD COLUMN IF NOT EXISTS fecha_devolucion timestamp DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS devuelto_por varchar(36) DEFAULT NULL;

-- Permiso propio (patrón de 012 con accept_transfer): el barman es quien maneja
-- los envases en la barra y products.write no le sirve porque no lo tiene.
INSERT INTO permissions (id, name, description, module, action, created_at, updated_at)
SELECT '33f07d92-9fe9-4fb8-a808-b556542e7c69', 'Verificar devolución de envases',
  'Escanear un envase vacío, confirmar que es nuestro y marcarlo como devuelto',
  'products', 'return_container', now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM permissions WHERE module = 'products' AND action = 'return_container' AND deleted_at IS NULL
);

INSERT INTO role_permissions (id, role_id, permission_id, created_at)
SELECT gen_random_uuid()::text, r.id_rol, p.id, now()
FROM roles r CROSS JOIN permissions p
WHERE LOWER(r.nombre) = 'barman'
  AND p.module = 'products' AND p.action = 'return_container' AND p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id_rol AND rp.permission_id = p.id
  );
