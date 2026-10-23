-- 102) Reservas de quincho -----------------------------------------------------
-- Módulo nuevo: una reserva registra la fecha del quincho, cuántas personas
-- vienen y cuánto paga cada una. El total (personas × monto por persona) se
-- acredita al saldo prepago del cliente con el método de pago elegido, así que
-- el cobro entra a caja igual que una recarga de saldo (workflow
-- `reservarQuincho`). Anular una reserva devuelve ese monto al cliente
-- descontándolo de su saldo prepago.
CREATE TABLE IF NOT EXISTS reservas_quincho (
  id varchar(36) NOT NULL,
  cliente_id varchar(36) NOT NULL,
  fecha_reserva date NOT NULL,
  cantidad_personas integer NOT NULL,
  monto_por_persona integer NOT NULL,
  total integer NOT NULL,
  metodo_pago varchar(20) NOT NULL DEFAULT 'efectivo',
  observaciones text DEFAULT NULL,
  estado varchar(10) NOT NULL DEFAULT 'activa',
  usuario_id varchar(36) DEFAULT NULL,
  fecha_crea timestamp NOT NULL DEFAULT now(),
  fecha_anulacion timestamp DEFAULT NULL,
  anulada_por varchar(36) DEFAULT NULL,
  CONSTRAINT pk_reservas_quincho PRIMARY KEY (id),
  CONSTRAINT chk_reservas_quincho_personas CHECK (cantidad_personas > 0),
  CONSTRAINT chk_reservas_quincho_montos CHECK (monto_por_persona >= 0 AND total >= 0),
  CONSTRAINT chk_reservas_quincho_metodo CHECK (metodo_pago IN ('efectivo', 'tarjeta', 'transferencia')),
  CONSTRAINT chk_reservas_quincho_estado CHECK (estado IN ('activa', 'anulada')),
  CONSTRAINT fk_reservas_quincho_cliente FOREIGN KEY (cliente_id)
    REFERENCES clientes (id_cliente) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reservas_quincho_fecha ON reservas_quincho (fecha_reserva);
CREATE INDEX IF NOT EXISTS idx_reservas_quincho_cliente ON reservas_quincho (cliente_id);

-- Catálogo de permisos del módulo. `view` abre la pantalla, `create` cobra la
-- reserva (mueve caja y prepago) y `delete` la anula devolviendo el saldo.
INSERT INTO permissions (id, name, description, module, action, created_at, updated_at)
SELECT '9b2f0c4e-31a7-4f6e-8d2a-0c1e7a5b9f01', 'Ver reservas de quincho',
  'Acceso al listado de reservas de quincho', 'quinchos', 'view', now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM permissions WHERE module = 'quinchos' AND action = 'view' AND deleted_at IS NULL
);

INSERT INTO permissions (id, name, description, module, action, created_at, updated_at)
SELECT '9b2f0c4e-31a7-4f6e-8d2a-0c1e7a5b9f02', 'Registrar reservas de quincho',
  'Cobrar una reserva de quincho y acreditar el total al prepago del cliente', 'quinchos', 'create', now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM permissions WHERE module = 'quinchos' AND action = 'create' AND deleted_at IS NULL
);

INSERT INTO permissions (id, name, description, module, action, created_at, updated_at)
SELECT '9b2f0c4e-31a7-4f6e-8d2a-0c1e7a5b9f03', 'Anular reservas de quincho',
  'Anular una reserva de quincho y devolver el monto del prepago del cliente', 'quinchos', 'delete', now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM permissions WHERE module = 'quinchos' AND action = 'delete' AND deleted_at IS NULL
);

-- Ver y registrar: lo opera quien cobra en el local (administrador y cajero).
INSERT INTO role_permissions (id, role_id, permission_id, created_at)
SELECT gen_random_uuid()::text, r.id_rol, p.id, now()
FROM roles r CROSS JOIN permissions p
WHERE LOWER(r.nombre) IN ('administrador', 'cajero')
  AND p.module = 'quinchos' AND p.action IN ('view', 'create') AND p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id_rol AND rp.permission_id = p.id
  );

-- Anular devuelve dinero: solo el administrador.
INSERT INTO role_permissions (id, role_id, permission_id, created_at)
SELECT gen_random_uuid()::text, r.id_rol, p.id, now()
FROM roles r CROSS JOIN permissions p
WHERE LOWER(r.nombre) = 'administrador'
  AND p.module = 'quinchos' AND p.action = 'delete' AND p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id_rol AND rp.permission_id = p.id
  );
