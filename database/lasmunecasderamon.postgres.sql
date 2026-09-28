-- ============================================================
-- PostgreSQL — Solo esquema + semilla minima. SIN datos personales.
--
-- Generado por: scripts/make-schema-only-dump.mjs (transformador one-shot
-- sobre el dump historico de datos; ese dump fue retirado del repositorio
-- porque traia nombres, telefonos, correos y hashes del personal real).
--
-- Contenido:
--   1. DDL completo (tablas, indices, constraints, identidad, trigger).
--   2. Semilla: roles, permissions, role_permissions, configuraciones,
--      habitaciones, categorias, productos.
--   3. Un admin semilla (nick 'Admin', rol Administrador) con
--      force_password_change = 1: la primera sesion obliga a elegir
--      contraseña. La inicial documentada es 'Cambio2026!'.
--   4. El codigo del local NO viaja: se acuna solo en el primer arranque
--      (getOrCreateAttendanceCode).
--
-- Despues de importar este archivo se ejecutan las migraciones
-- (scripts/ci-setup-db.js o pnpm db:setup). NO editar a mano: regenerar con
-- el transformador a partir de un dump fresco de la base de referencia.
-- ============================================================
BEGIN;

CREATE TABLE anticipos (
  id_anticipo varchar(36) NOT NULL,
  usuario_id varchar(36) DEFAULT NULL,
  monto integer NOT NULL,
  motivo text,
  asistencia integer NOT NULL DEFAULT 0,
  comision integer NOT NULL DEFAULT 0,
  propina integer NOT NULL DEFAULT 0,
  fecha_crea timestamp NOT NULL,
  fecha_mod timestamp DEFAULT NULL,
  estado integer NOT NULL DEFAULT 1,
  fecha_aprobacion timestamp DEFAULT NULL,
  fecha_cobro timestamp DEFAULT NULL,
  entregado_por varchar(36) DEFAULT NULL,
  fecha_entrega timestamp DEFAULT NULL
);

CREATE TABLE anticipo_historial (
  id bigint NOT NULL,
  anticipo_id varchar(36) NOT NULL,
  accion varchar(50) NOT NULL,
  usuario_id varchar(36) DEFAULT NULL,
  fecha_crea timestamp NOT NULL
);
COMMENT ON COLUMN anticipo_historial.accion IS 'accion realizada: solicitud, aprobado, rechazado, entregado, etc.';
COMMENT ON COLUMN anticipo_historial.usuario_id IS 'usuario que realizo la accion (admin/cajero)';

CREATE TABLE asistencias (
  id_asistencia varchar(36) NOT NULL,
  hora time NOT NULL,
  fecha date NOT NULL,
  fecha_pago timestamp DEFAULT NULL,
  usuario_id varchar(36) DEFAULT NULL,
  estado integer NOT NULL DEFAULT 1
);

CREATE TABLE audit_logs (
  id varchar(36) NOT NULL,
  user_id varchar(36) DEFAULT NULL,
  action varchar(100) NOT NULL,
  resource_type varchar(50) DEFAULT NULL,
  resource_id varchar(36) DEFAULT NULL,
  details text,
  ip_address varchar(45) DEFAULT NULL,
  created_at timestamp NOT NULL
);

CREATE TABLE backups (
  id_backup varchar(255) NOT NULL,
  nombre varchar(255) NOT NULL,
  descripcion text NOT NULL,
  tablas_incluidas text NOT NULL,
  registros_count text NOT NULL,
  tamano_bytes integer NOT NULL,
  fecha_crea timestamp NOT NULL,
  estado integer NOT NULL,
  PRIMARY KEY (id_backup)
);

CREATE TABLE cajas (
  id_caja varchar(36) NOT NULL,
  fecha_apertura timestamp NOT NULL,
  usuario_id_apertura varchar(36) DEFAULT NULL,
  monto_apertura integer NOT NULL,
  efectivo integer NOT NULL,
  tarjeta integer NOT NULL,
  transferencia integer NOT NULL DEFAULT 0,
  prepago integer DEFAULT 0,
  usuario_id_cierre varchar(36) DEFAULT NULL,
  fecha_cierre timestamp DEFAULT NULL,
  monto_cierre integer NOT NULL,
  venta integer NOT NULL DEFAULT 0,
  cargo_tarjeta integer NOT NULL DEFAULT 0,
  servicio integer DEFAULT 0,
  devolucion integer DEFAULT 0,
  iva integer NOT NULL DEFAULT 0,
  comision integer NOT NULL DEFAULT 0,
  propina integer NOT NULL DEFAULT 0,
  anticipo integer NOT NULL DEFAULT 0,
  estado integer NOT NULL DEFAULT 1
);

CREATE TABLE categorias (
  id_categoria varchar(36) NOT NULL,
  nombre varchar(255) NOT NULL,
  descripcion text NOT NULL DEFAULT 'Sin descripción',
  estado integer NOT NULL DEFAULT 1,
  fecha_crea timestamp NOT NULL,
  fecha_mod timestamp DEFAULT NULL,
  fecha_baja timestamp DEFAULT NULL,
  display_order integer DEFAULT 0
);

CREATE TABLE clientes (
  id_cliente varchar(36) NOT NULL,
  run varchar(20) DEFAULT NULL,
  nombre varchar(255) NOT NULL,
  apellido varchar(255) NOT NULL,
  telefono varchar(50) DEFAULT NULL,
  fecha_crea timestamp NOT NULL,
  fecha_mod timestamp DEFAULT NULL,
  estado integer NOT NULL DEFAULT 1,
  saldo integer DEFAULT 0
);

CREATE TABLE clientes_prepago_movimientos (
  id_movimiento varchar(36) NOT NULL,
  cliente_id varchar(36) NOT NULL,
  tipo varchar(14) NOT NULL,
  monto integer NOT NULL,
  metodo_pago varchar(50) DEFAULT NULL,
  venta_id varchar(36) DEFAULT NULL,
  usuario_id varchar(36) DEFAULT NULL,
  fecha_crea timestamp NOT NULL,
  metadatos text
);
ALTER TABLE clientes_prepago_movimientos ADD CONSTRAINT chk_clientes_prepago_movimientos_tipo CHECK (tipo IN ('CARGA', 'CONSUMO', 'DEVOLUCION'));

CREATE TABLE codigos (
  id_codigo varchar(36) NOT NULL,
  codigo varchar(10) NOT NULL,
  fecha_crea timestamp NOT NULL,
  estado integer NOT NULL DEFAULT 1
);

CREATE TABLE comisiones (
  id_comision varchar(36) NOT NULL,
  venta_id varchar(36) DEFAULT NULL,
  servicio_id varchar(36) DEFAULT NULL,
  monto integer NOT NULL DEFAULT 0,
  estado integer NOT NULL DEFAULT 1,
  fecha_crea timestamp NOT NULL,
  fecha_mod timestamp DEFAULT NULL
);

CREATE TABLE producto_champagne_tiers (
  id varchar(36) PRIMARY KEY,
  producto_id varchar(36) NOT NULL,
  anfitrionas integer NOT NULL,
  precio integer NOT NULL DEFAULT 0,
  comision integer NOT NULL DEFAULT 0,
  UNIQUE (producto_id, anfitrionas)
);
CREATE INDEX idx_champagne_tiers_producto
  ON producto_champagne_tiers (producto_id);

CREATE TABLE configuraciones (
  id varchar(36) NOT NULL,
  clave varchar(100) NOT NULL,
  valor text,
  descripcion varchar(255) DEFAULT NULL,
  categoria varchar(50) NOT NULL DEFAULT 'general',
  tipo varchar(20) NOT NULL DEFAULT 'text',
  fecha_crea timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_mod timestamp DEFAULT NULL
);

CREATE TABLE cuentas (
  id_cuenta varchar(36) NOT NULL,
  codigo varchar(50) NOT NULL,
  cliente_id varchar(36) DEFAULT NULL,
  total_comision integer NOT NULL,
  habitacion_id varchar(36) DEFAULT NULL,
  sub_total integer NOT NULL,
  total integer NOT NULL,
  metodo_pago varchar(50) DEFAULT NULL,
  pedido_id varchar(36) DEFAULT NULL,
  servicio_id varchar(36) DEFAULT NULL,
  fecha_crea timestamp NOT NULL,
  fecha_mod timestamp DEFAULT NULL,
  estado integer NOT NULL DEFAULT 1,
  tiempo integer DEFAULT 0,
  tiempo_actual integer DEFAULT 0,
  tiempo_inicio_actual timestamp DEFAULT NULL,
  habitaciones_historial text,
  created_by varchar(36) DEFAULT NULL,
  cobrado_por varchar(50) DEFAULT NULL,
  propina integer DEFAULT NULL,
  push_notified_5m smallint DEFAULT 0,
  push_notified_end smallint DEFAULT 0
);

CREATE TABLE cuentas_usuarios (
  id_cuenta_usuario varchar(36) NOT NULL,
  cuenta_id varchar(36) DEFAULT NULL,
  usuario_id varchar(36) DEFAULT NULL,
  fecha_crea timestamp NOT NULL
);

CREATE TABLE detalle_comisiones (
  id_detalle_comision varchar(36) NOT NULL,
  comision_id varchar(36) DEFAULT NULL,
  usuario_id varchar(36) DEFAULT NULL,
  comision integer NOT NULL DEFAULT 0,
  fecha_crea timestamp NOT NULL,
  fecha_mod timestamp DEFAULT NULL,
  estado integer NOT NULL DEFAULT 1
);

CREATE TABLE detalle_cuentas (
  id_detalle_cuenta varchar(36) NOT NULL,
  cuenta_id varchar(36) DEFAULT NULL,
  producto_id varchar(36) DEFAULT NULL,
  precio integer NOT NULL,
  cantidad integer NOT NULL,
  sub_total integer NOT NULL,
  comision integer NOT NULL,
  hostess_id varchar(36) DEFAULT NULL,
  fecha_crea timestamp NOT NULL,
  created_by varchar(50) DEFAULT NULL
);

CREATE TABLE detalle_devoluciones_servicios (
  id_detalle_devolucion varchar(36) NOT NULL,
  devolucion_servicio_id varchar(36) DEFAULT NULL,
  usuario_id varchar(36) DEFAULT NULL,
  monto integer NOT NULL
);

CREATE TABLE detalle_devoluciones_ventas (
  id_detalle_devolucion varchar(36) NOT NULL,
  devolucion_venta_id varchar(36) DEFAULT NULL,
  producto_id varchar(36) DEFAULT NULL,
  cantidad integer NOT NULL,
  precio integer NOT NULL,
  comision integer NOT NULL,
  fecha_crea timestamp NOT NULL,
  estado integer NOT NULL DEFAULT 1
);

CREATE TABLE detalle_pedidos (
  id_detalle_pedido varchar(36) NOT NULL,
  pedido_id varchar(36) DEFAULT NULL,
  producto_id varchar(36) DEFAULT NULL,
  precio integer NOT NULL,
  comision integer NOT NULL,
  genera_comision smallint NOT NULL DEFAULT 1,
  hostess_id varchar(36) DEFAULT NULL,
  habitacion_id varchar(36) DEFAULT NULL,
  cantidad integer NOT NULL,
  subtotal integer NOT NULL,
  fecha_crea timestamp NOT NULL
);
COMMENT ON COLUMN detalle_pedidos.genera_comision IS 'Indica si el producto genera comisión para las anfitrionas (1=Sí, 0=No)';

CREATE TABLE detalle_pedidos_anfitrionas (
  id_detalle_anfitriona varchar(36) NOT NULL,
  detalle_pedido_id varchar(36) NOT NULL,
  anfitriona_id varchar(36) NOT NULL,
  fecha_crea timestamp NOT NULL
);

CREATE TABLE detalle_propinas (
  id_detalle_propina varchar(36) NOT NULL,
  propina_id varchar(36) DEFAULT NULL,
  usuario_id varchar(36) DEFAULT NULL,
  monto integer NOT NULL,
  fecha_crea timestamp NOT NULL,
  fecha_mod timestamp DEFAULT NULL,
  estado integer NOT NULL DEFAULT 1
);

CREATE TABLE detalle_servicios (
  id_detalle_servicio varchar(36) NOT NULL,
  usuario_id varchar(36) DEFAULT NULL,
  comision integer NOT NULL DEFAULT 0,
  servicio_id varchar(36) DEFAULT NULL,
  fecha_crea timestamp NOT NULL
);

CREATE TABLE detalle_servicios_clientes (
  id varchar(36) NOT NULL,
  servicio_id varchar(36) DEFAULT NULL,
  cliente_id varchar(36) DEFAULT NULL
);

CREATE TABLE detalle_ventas (
  id_detalle_venta varchar(36) NOT NULL,
  venta_id varchar(36) DEFAULT NULL,
  producto_id varchar(36) DEFAULT NULL,
  presentacion_id varchar(36) DEFAULT NULL,
  precio integer NOT NULL,
  comision integer NOT NULL,
  hostess_id varchar(36) DEFAULT NULL,
  cantidad integer NOT NULL,
  sub_total integer NOT NULL,
  fecha_crea timestamp NOT NULL
);

CREATE TABLE devoluciones_servicios (
  id_devolucion varchar(36) NOT NULL,
  servicio_id varchar(36) DEFAULT NULL,
  pieza_id varchar(36) DEFAULT NULL,
  cliente_id varchar(36) DEFAULT NULL,
  total integer NOT NULL,
  fecha_crea timestamp NOT NULL
);

CREATE TABLE devoluciones_ventas (
  id_devolucion_venta varchar(36) NOT NULL,
  cliente_id varchar(36) DEFAULT NULL,
  venta_id varchar(36) DEFAULT NULL,
  total integer NOT NULL,
  fecha_crea timestamp NOT NULL,
  estado integer NOT NULL DEFAULT 1
);

CREATE TABLE devoluciones_ventas_usuarios (
  id_devolucion_usuario varchar(36) NOT NULL,
  detalle_devolucion_venta_id varchar(36) DEFAULT NULL,
  usuario_id varchar(36) DEFAULT NULL
);

CREATE TABLE error_logs (
  id varchar(36) NOT NULL,
  endpoint varchar(255) DEFAULT NULL,
  error_message text,
  stack_trace text,
  request_body text,
  fecha_crea timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE gratificaciones (
  id varchar(36) NOT NULL,
  usuario_id varchar(36) DEFAULT NULL,
  solicitante_id varchar(36) DEFAULT NULL,
  monto integer NOT NULL,
  descripcion text,
  estado integer NOT NULL DEFAULT 1,
  fecha_crea timestamp NOT NULL,
  fecha_mod timestamp DEFAULT NULL
);

CREATE TABLE habitaciones (
  id_habitacion varchar(36) NOT NULL,
  nombre varchar(100) NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  precio integer NOT NULL,
  tiempo integer NOT NULL,
  comision_anfitriona integer DEFAULT NULL,
  estado integer NOT NULL DEFAULT 1,
  fecha_crea timestamp NOT NULL,
  fecha_mod timestamp DEFAULT NULL,
  fecha_baja timestamp DEFAULT NULL
);

CREATE TABLE horas_extras (
  id_hora_extra varchar(36) NOT NULL,
  usuario_id varchar(36) DEFAULT NULL,
  hora integer NOT NULL,
  monto integer NOT NULL,
  total integer NOT NULL,
  fecha_crea timestamp NOT NULL,
  fecha_mod timestamp DEFAULT NULL,
  estado integer NOT NULL DEFAULT 1
);

CREATE TABLE logins (
  id_login varchar(36) NOT NULL,
  usuario_id varchar(36) NOT NULL,
  last_login timestamp NOT NULL,
  estado integer NOT NULL DEFAULT 1,
  ip_address varchar(45) DEFAULT NULL,
  en_local smallint DEFAULT 0
);

CREATE TABLE notificaciones (
  id varchar(36) NOT NULL,
  usuario_id varchar(36) DEFAULT NULL,
  rol_destinatario varchar(50) DEFAULT NULL,
  tipo varchar(50) NOT NULL,
  titulo varchar(255) DEFAULT NULL,
  mensaje text,
  datos text,
  leida smallint NOT NULL DEFAULT 0,
  fecha_crea timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_leida timestamp DEFAULT NULL
);

CREATE TABLE pedidos (
  id_pedido varchar(36) NOT NULL,
  codigo varchar(15) NOT NULL,
  mesero_id varchar(36) DEFAULT NULL,
  cliente_id varchar(36) DEFAULT NULL,
  subtotal integer NOT NULL,
  total integer NOT NULL,
  propina integer NOT NULL DEFAULT 0,
  total_comision integer NOT NULL,
  fecha_crea timestamp NOT NULL,
  fecha_mod timestamp DEFAULT NULL,
  fecha_baja timestamp DEFAULT NULL,
  estado integer NOT NULL DEFAULT 1
);

CREATE TABLE pedidos_usuarios (
  id_pedido_usuario varchar(36) NOT NULL,
  usuario_id varchar(36) DEFAULT NULL,
  pedido_id varchar(36) DEFAULT NULL
);

CREATE TABLE permissions (
  id varchar(36) NOT NULL,
  name varchar(100) NOT NULL,
  description text,
  module varchar(50) NOT NULL,
  action varchar(50) NOT NULL,
  created_at timestamp NOT NULL,
  updated_at timestamp DEFAULT NULL,
  deleted_at timestamp DEFAULT NULL
);

CREATE TABLE productos (
  id_producto varchar(36) NOT NULL,
  codigo varchar(20) NOT NULL,
  nombre varchar(255) NOT NULL,
  categoria_id varchar(36) DEFAULT NULL,
  display_order integer NOT NULL DEFAULT 0,
  precio integer NOT NULL,
  comision integer NOT NULL,
  descripcion varchar(255) DEFAULT 'Sin descripcion',
  fecha_crea timestamp NOT NULL,
  fecha_mod timestamp DEFAULT NULL,
  fecha_baja timestamp DEFAULT NULL,
  estado integer NOT NULL DEFAULT 1,
  foto varchar(255) NOT NULL DEFAULT 'default.png',
  stock_almacen integer NOT NULL DEFAULT 0,
  ml_shot_anfitriona integer DEFAULT NULL
);

CREATE TABLE inventario_presentaciones (
  id varchar(36) PRIMARY KEY,
  producto_id varchar(36) NOT NULL,
  nombre varchar(100) NOT NULL,
  codigo_barras varchar(50) DEFAULT NULL,
  precio_compra integer NOT NULL DEFAULT 0,
  precio_venta integer NOT NULL DEFAULT 0,
  comision integer NOT NULL DEFAULT 0,
  opciones_venta text DEFAULT NULL,
  foto varchar(255) DEFAULT NULL,
  ml_botella integer DEFAULT NULL,
  fecha_crea timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_inventario_presentaciones_codigo_barras
  ON inventario_presentaciones (codigo_barras);

CREATE SEQUENCE inventario_sku_seq;

CREATE TABLE inventario_unidades (
  id varchar(36) PRIMARY KEY,
  producto_id varchar(36) NOT NULL,
  presentacion_id varchar(36) DEFAULT NULL,
  codigo varchar(20) NOT NULL UNIQUE,
  codigo_barras varchar(20) DEFAULT NULL UNIQUE,
  ubicacion varchar(20) NOT NULL DEFAULT 'almacen',
  transferencia_id varchar(36) DEFAULT NULL,
  estado varchar(20) NOT NULL DEFAULT 'almacen',
  ml_restante integer DEFAULT NULL,
  fecha_devolucion timestamp DEFAULT NULL,
  devuelto_por varchar(36) DEFAULT NULL,
  fecha_confirmacion timestamp DEFAULT NULL,
  confirmado_por varchar(36) DEFAULT NULL,
  fecha_crea timestamp NOT NULL DEFAULT now()
);
CREATE INDEX idx_inventario_unidades_producto
  ON inventario_unidades (producto_id);

CREATE TABLE inventario_movimientos (
  id varchar(36) PRIMARY KEY,
  tipo varchar(20) NOT NULL,
  producto_id varchar(36) DEFAULT NULL,
  presentacion_id varchar(36) DEFAULT NULL,
  cantidad integer NOT NULL DEFAULT 0,
  precio_venta integer DEFAULT NULL,
  comision integer DEFAULT NULL,
  usuario_id varchar(36) DEFAULT NULL,
  solicitado_por varchar(36) DEFAULT NULL,
  aprobado_por varchar(36) DEFAULT NULL,
  estado varchar(20) NOT NULL DEFAULT 'pendiente',
  opciones_venta text DEFAULT NULL,
  aceptado_por varchar(36) DEFAULT NULL,
  fecha_aceptacion timestamp DEFAULT NULL,
  ml integer DEFAULT NULL,
  fecha_crea timestamp NOT NULL DEFAULT now()
);
CREATE INDEX idx_inventario_movimientos_producto
  ON inventario_movimientos (producto_id);
CREATE INDEX idx_inventario_movimientos_presentacion
  ON inventario_movimientos (presentacion_id);

CREATE TABLE propinas (
  id_propina varchar(36) NOT NULL,
  venta_id varchar(36) DEFAULT NULL,
  propina integer NOT NULL,
  fecha_crea timestamp NOT NULL,
  fecha_mod timestamp DEFAULT NULL,
  estado integer NOT NULL DEFAULT 1
);

CREATE TABLE query_logs (
  id bigint NOT NULL,
  sql text NOT NULL,
  params_count integer NOT NULL DEFAULT 0,
  duration_ms numeric(10,1) NOT NULL,
  query_type varchar(20) NOT NULL,
  query_count integer DEFAULT NULL,
  avg_query_ms numeric(10,1) DEFAULT NULL,
  total_query_time_ms numeric(10,1) DEFAULT NULL,
  created_at timestamp NOT NULL
);
COMMENT ON TABLE query_logs IS 'Slow queries (>50ms) registradas automaticamente por db.ts';
COMMENT ON COLUMN query_logs.sql IS 'Query text (truncated to 500 chars)';
COMMENT ON COLUMN query_logs.duration_ms IS 'Query duration in milliseconds';
COMMENT ON COLUMN query_logs.query_type IS 'query, transaction_query, or transaction';
COMMENT ON COLUMN query_logs.query_count IS 'For transaction level logs: number of queries in transaction';
COMMENT ON COLUMN query_logs.avg_query_ms IS 'For transaction level logs: average query time';
COMMENT ON COLUMN query_logs.total_query_time_ms IS 'For transaction level logs: total query time';

CREATE TABLE retiros_caja (
  id_retiro varchar(36) NOT NULL,
  caja_id varchar(36) DEFAULT NULL,
  monto integer NOT NULL,
  motivo text NOT NULL,
  usuario_id varchar(36) DEFAULT NULL,
  fecha_retiro timestamp NOT NULL
);

CREATE TABLE roles (
  id_rol varchar(36) NOT NULL,
  nombre varchar(255) NOT NULL,
  descripcion text NOT NULL,
  estado integer NOT NULL DEFAULT 1,
  fecha_crea timestamp NOT NULL,
  fecha_mod timestamp DEFAULT NULL,
  fecha_baja timestamp DEFAULT NULL
);

CREATE TABLE role_permissions (
  id varchar(36) NOT NULL,
  role_id varchar(36) DEFAULT NULL,
  permission_id varchar(36) DEFAULT NULL,
  created_at timestamp NOT NULL,
  updated_at timestamp DEFAULT NULL
);

CREATE TABLE servicios (
  id_servicio varchar(36) NOT NULL,
  codigo varchar(50) NOT NULL,
  cliente_id varchar(36) DEFAULT NULL,
  habitacion_id varchar(36) DEFAULT NULL,
  precio_habitacion integer NOT NULL,
  precio_servicio integer NOT NULL,
  iva integer NOT NULL DEFAULT 0,
  sub_total integer NOT NULL,
  total integer NOT NULL,
  tiempo integer NOT NULL,
  metodo_pago varchar(50) NOT NULL,
  caja_id varchar(36) DEFAULT NULL,
  fecha_crea timestamp NOT NULL,
  fecha_mod timestamp DEFAULT NULL,
  estado integer NOT NULL DEFAULT 1,
  es_temporal smallint NOT NULL DEFAULT 0,
  servicio_original_id varchar(36) DEFAULT NULL,
  created_by varchar(36) DEFAULT NULL,
  paused_at timestamp DEFAULT NULL,
  push_notified_5m smallint DEFAULT 0,
  push_notified_end smallint DEFAULT 0,
  pagos_mixtos text
);

CREATE TABLE servicio_logs (
  id varchar(36) NOT NULL,
  servicio_id varchar(36) DEFAULT NULL,
  tipo_evento varchar(50) NOT NULL,
  descripcion text,
  fecha_crea timestamp NOT NULL,
  usuario_id varchar(36) DEFAULT NULL
);

CREATE TABLE solicitudes_anticipos (
  id_solicitud varchar(36) NOT NULL,
  usuario_id varchar(36) DEFAULT NULL,
  monto numeric(10,2) NOT NULL,
  motivo text,
  estado varchar(14) DEFAULT 'pendiente',
  motivo_rechazo text,
  token varchar(100) DEFAULT NULL,
  fecha_crea timestamp NOT NULL,
  fecha_mod timestamp DEFAULT NULL,
  admin_id varchar(36) DEFAULT NULL
);
ALTER TABLE solicitudes_anticipos ADD CONSTRAINT chk_solicitudes_anticipos_estado CHECK (estado IN ('pendiente', 'confirmada', 'rechazada'));

CREATE TABLE solicitudes_anulacion_cuentas (
  id varchar(36) NOT NULL,
  cuenta_id varchar(36) NOT NULL,
  monto numeric(12,2) NOT NULL DEFAULT 0.00,
  motivo text,
  requested_by varchar(36) NOT NULL,
  approved_by varchar(36) DEFAULT NULL,
  estado varchar(20) NOT NULL DEFAULT 'pendiente',
  fecha_crea timestamp NOT NULL,
  fecha_mod timestamp DEFAULT NULL
);

CREATE TABLE solicitudes_anulacion_servicios (
  id varchar(36) NOT NULL,
  servicio_id varchar(36) DEFAULT NULL,
  token varchar(255) NOT NULL,
  estado varchar(14) DEFAULT 'pendiente',
  fecha_solicitud timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  solicitado_por varchar(255) DEFAULT 'Usuario del Sistema',
  motivo varchar(500) DEFAULT 'Motivo no especificado'
);
ALTER TABLE solicitudes_anulacion_servicios ADD CONSTRAINT chk_solicitudes_anulacion_servicios_estado CHECK (estado IN ('pendiente', 'confirmada', 'rechazada'));

CREATE TABLE solicitudes_anulacion_ventas (
  id varchar(36) NOT NULL,
  venta_id varchar(36) DEFAULT NULL,
  token varchar(255) NOT NULL,
  estado varchar(14) DEFAULT 'pendiente',
  fecha_solicitud timestamp NOT NULL,
  solicitado_por varchar(255) DEFAULT 'Usuario del Sistema',
  motivo varchar(500) DEFAULT 'Motivo no especificado',
  monto numeric(12,2) DEFAULT NULL
);
ALTER TABLE solicitudes_anulacion_ventas ADD CONSTRAINT chk_solicitudes_anulacion_ventas_estado CHECK (estado IN ('pendiente', 'confirmada', 'rechazada'));

CREATE TABLE solicitudes_atencion (
  id varchar(36) NOT NULL,
  anfitriona_id varchar(36) DEFAULT NULL,
  habitacion_id varchar(36) DEFAULT NULL,
  servicio_id varchar(36) DEFAULT NULL,
  tipo varchar(50) NOT NULL,
  mensaje text,
  estado smallint DEFAULT 0,
  atendido_por varchar(36) DEFAULT NULL,
  fecha_crea timestamp DEFAULT NULL,
  fecha_acepta timestamp DEFAULT NULL
);

CREATE TABLE solicitudes_servicios (
  id_solicitud varchar(36) NOT NULL,
  codigo varchar(8) DEFAULT NULL,
  cliente_id varchar(36) DEFAULT NULL,
  habitacion_id varchar(36) DEFAULT NULL,
  precio_servicio numeric(10,2) NOT NULL DEFAULT 0.00,
  iva integer NOT NULL DEFAULT 0,
  precio_habitacion numeric(10,2) NOT NULL DEFAULT 0.00,
  comision_anfitriona numeric(10,2) NOT NULL DEFAULT 0.00,
  anfitrionas_ids text NOT NULL,
  num_clientes integer NOT NULL DEFAULT 1,
  metodo_pago varchar(50) NOT NULL,
  tiempo integer NOT NULL,
  total numeric(10,2) NOT NULL,
  solicitado_por varchar(36) DEFAULT NULL,
  estado varchar(13) NOT NULL DEFAULT 'pendiente',
  motivo_rechazo text,
  procesado_por varchar(36) DEFAULT NULL,
  fecha_solicitud timestamp NOT NULL,
  fecha_procesamiento timestamp DEFAULT NULL
);
ALTER TABLE solicitudes_servicios ADD CONSTRAINT chk_solicitudes_servicios_estado CHECK (estado IN ('pendiente', 'aprobada', 'rechazada'));

CREATE TABLE usuarios (
  id_usuario varchar(36) NOT NULL,
  run varchar(50) NOT NULL,
  nick varchar(255) DEFAULT NULL,
  nombre varchar(255) NOT NULL,
  apellido varchar(255) NOT NULL,
  direccion varchar(255) NOT NULL,
  telefono varchar(50) NOT NULL,
  estado_civil varchar(50) NOT NULL,
  afp varchar(100) NOT NULL,
  aporte integer NOT NULL,
  sueldo integer NOT NULL,
  descuento integer NOT NULL DEFAULT 0,
  email varchar(255) DEFAULT NULL,
  password varchar(255) NOT NULL,
  rol_id varchar(36) DEFAULT NULL,
  foto varchar(255) NOT NULL DEFAULT 'default.png',
  estado integer NOT NULL DEFAULT 1,
  estado_servicio integer NOT NULL DEFAULT 1,
  fecha_crea timestamp NOT NULL,
  fecha_mod timestamp DEFAULT NULL,
  fecha_baja timestamp DEFAULT NULL,
  push_token varchar(255) DEFAULT NULL,
  qr_token varchar(255) DEFAULT NULL,
  force_password_change smallint NOT NULL DEFAULT 1
);

CREATE TABLE ventas (
  id_venta varchar(36) NOT NULL,
  codigo varchar(20) NOT NULL,
  cliente_id varchar(36) DEFAULT NULL,
  pedido_id varchar(36) DEFAULT NULL,
  caja_id varchar(36) DEFAULT NULL,
  habitacion_id varchar(36) DEFAULT NULL,
  metodo_pago varchar(50) NOT NULL,
  propina integer NOT NULL,
  cargo_tarjeta integer NOT NULL DEFAULT 0,
  sub_total integer NOT NULL,
  total integer NOT NULL,
  total_comision integer NOT NULL DEFAULT 0,
  tiempo integer DEFAULT 0,
  fecha_crea timestamp NOT NULL,
  fecha_mod timestamp DEFAULT NULL,
  estado integer NOT NULL DEFAULT 1,
  created_by varchar(36) DEFAULT NULL,
  paused_at timestamp DEFAULT NULL,
  cuenta_id varchar(36) DEFAULT NULL,
  push_notified_5m smallint DEFAULT 0,
  push_notified_end smallint DEFAULT 0,
  pagos_mixtos text
);

CREATE TABLE ventas_usuarios (
  id_usuario_venta varchar(36) NOT NULL,
  usuario_id varchar(36) DEFAULT NULL,
  venta_id varchar(36) DEFAULT NULL,
  fecha_crea timestamp NOT NULL
);

CREATE TABLE venta_logs (
  id varchar(36) NOT NULL,
  venta_id varchar(36) NOT NULL,
  tipo_evento varchar(50) NOT NULL,
  descripcion text,
  fecha_crea timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_id varchar(36) DEFAULT NULL
);

CREATE TABLE _migrations (
  id integer NOT NULL,
  filename varchar(255) NOT NULL,
  executed_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO roles (id_rol, nombre, descripcion, estado, fecha_crea, fecha_mod, fecha_baja) VALUES
('0b178ca4-559a-43f1-bacf-25cb7eecb3e2', 'Anfitriona', 'Acceso a la app', 1, '2026-03-16 05:24:45', NULL, NULL),
('3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'Administrador', 'Rol administrador creado automáticamente', 1, '2026-03-16 04:43:46', NULL, NULL),
('8bb76943-c1ec-46ae-ab32-76d35e9726e0', 'Cajero', 'Acceso al sistema y a la app', 1, '2026-03-16 05:25:17', NULL, NULL),
('fbd81d2c-52fc-463b-b4cf-076fc9302e20', 'Garzon', 'Acceso a la app', 1, '2026-03-16 05:25:05', NULL, NULL);

INSERT INTO permissions (id, name, description, module, action, created_at, updated_at, deleted_at) VALUES
('05334ab3-b304-444e-97e9-d2f4fe9c1727', 'Ver devoluciones', 'Acceso para visualizar todos los registros de devoluciones', 'returns', 'view', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('08b5920d-e7b0-4e94-b906-42fbe3a08438', 'Ver detalles de clientes', 'Acceso para ver información detallada de clientes', 'clients', 'view_details', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('0fd0af1d-7082-4e4e-88e3-0d10a1a5256a', 'Procesar pedidos', 'Acceso para procesar y gestionar pedidos', 'orders', 'process', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('144321cb-2f96-4c27-a025-208bfcec01d3', 'Ver clientes', 'Acceso para visualizar todos los clientes', 'clients', 'view', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('145bfa46-2b45-424c-9ee2-233a0a6973a0', 'Crear gratificaciones', 'Acceso para crear nuevos registros de gratificaciones', 'gratificaciones', 'create', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('1787b46b-78fe-4a8b-9dc4-571fa7e56c20', 'Crear productos', 'Acceso para crear nuevos productos en el catálogo', 'products', 'create', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('191040bf-222c-4f15-b553-eb895b7b731a', 'Ver productos', 'Acceso para visualizar todos los productos', 'products', 'view', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('1d5107c3-ffd7-48ce-b06c-be010233766b', 'Ver ventas', 'Acceso para visualizar todas las ventas', 'sales', 'view', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('208d766e-6d5b-477c-a7eb-e480bff7467e', 'Crear cuentas', 'Acceso para crear nuevas cuentas de clientes', 'accounts', 'create', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('27f9e876-ea6d-45ba-98ee-a3bd44403cd8', 'Editar categorías', 'Acceso para modificar categorías existentes', 'categories', 'edit', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('28115302-66e3-432a-8a18-9e132ceed556', 'Crear pagos', 'Acceso para crear nuevos registros de pagos', 'payroll', 'create', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('2a6f78d5-8292-4177-8980-50f270b06657', 'Eliminar pedidos', 'Acceso para eliminar pedidos del sistema', 'orders', 'delete', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('2ce981cc-ee3e-41cd-82ad-181827ff4070', 'Aprobar horas extras', 'Acceso para aprobar solicitudes de horas extras', 'overtime', 'approve', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('2da2b944-aab4-4c60-bb06-024ba05d8959', 'Crear roles', 'Acceso para crear nuevos roles en el sistema', 'roles', 'create', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('2f6300f4-a115-4e95-a5b1-2576bfcc9c1d', 'Calcular comisiones', 'Acceso para calcular comisiones de empleados', 'commissions', 'calculate', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('2fb6087c-8784-401f-908f-3a3e2c158a26', 'Crear devoluciones', 'Acceso para crear nuevos registros de devoluciones', 'returns', 'create', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('36ef0033-2bc9-4f6e-840b-32496fc5fa9f', 'Editar pagos', 'Acceso para modificar información de pagos', 'payroll', 'edit', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('3a2d75fe-61a0-4332-b5b3-59e647c4409a', 'Crear asistencias', 'Acceso para registrar nuevas asistencias', 'attendance', 'create', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('3b154066-0f7e-486f-8e0b-b656338be78b', 'Desactivar usuarios', 'Acceso para desactivar usuarios del sistema', 'users', 'deactivate', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('3da800d8-d6d8-4e1b-84a8-3f9aa5b3347e', 'Crear horas extras', 'Acceso para crear nuevos registros de horas extras', 'overtime', 'create', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('3de31373-cc05-4203-a7ec-376ec4823df0', 'Eliminar comisiones', 'Acceso para eliminar registros de comisiones', 'commissions', 'delete', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('3dee3ac6-e672-4d03-8b66-a084b44ae044', 'Eliminar usuarios', 'Acceso para eliminar usuarios del sistema', 'users', 'delete', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('3f4bf3c0-bab0-4f9e-9f5f-dac06f3d9901', 'Ver dashboard', 'Acceso al panel de control principal', 'dashboard', 'view', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('41064d58-14fc-49f8-91de-9380c7657f45', 'Aprobar devoluciones', 'Acceso para aprobar solicitudes de devoluciones', 'returns', 'approve', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('41a21c0b-7fbc-46c1-b585-c19c8561126e', 'Ver servicios', 'Acceso para visualizar todos los servicios', 'services', 'view', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('43ac31fc-67ce-47e2-a221-6c4555a011cb', 'Aprobar anticipos', 'Acceso para aprobar solicitudes de anticipos', 'advances', 'approve', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('469bdde8-11fa-4260-bdf7-e72736d0995f', 'Eliminar roles', 'Acceso para eliminar roles del sistema', 'roles', 'delete', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('4794ec44-c5fa-41c9-a320-13aa9fb9f96d', 'Editar devoluciones', 'Acceso para modificar información de devoluciones', 'returns', 'edit', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('488b28c7-a27c-4b9c-9dfc-727e292d006b', 'Eliminar cuentas', 'Acceso para eliminar cuentas de clientes', 'accounts', 'delete', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('4bae7a62-c2f9-40df-b4b3-8a64df27ed61', 'Eliminar asistencias', 'Acceso para eliminar registros de asistencias', 'attendance', 'delete', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('4e0547d8-b16a-4bb4-9313-2b0637f8a14d', 'Editar propinas', 'Acceso para modificar registros de propinas', 'tips', 'edit', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('4ea0a72e-6948-4168-a24f-e4e9ea61ff50', 'Eliminar productos', 'Acceso para eliminar productos del catálogo', 'products', 'delete', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('50e30209-2afc-445c-ba21-0f5a0e7d82c3', 'Crear pedidos', 'Acceso para crear nuevos pedidos en el sistema', 'orders', 'create', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('50f47425-1305-41d8-8e48-66752616070e', 'Ver usuarios', 'Acceso para visualizar todos los usuarios', 'users', 'view', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('5386fcc0-f608-47be-a858-113d975c8292', 'Editar privados', 'Acceso para modificar servicios de habitaciones privadas', 'private_rooms', 'edit', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('566c5910-abf5-4382-8768-fb65d81749e9', 'Ver horas extras', 'Acceso para visualizar todos los registros de horas extras', 'overtime', 'view', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('57a6c962-d262-4cda-bd7c-71e32fdb5b6c', 'Editar asistencias', 'Acceso para modificar registros de asistencias', 'attendance', 'edit', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('5b040973-2dee-4b04-8d2d-d986c80f0d61', 'Editar cuentas', 'Acceso para modificar información de cuentas', 'accounts', 'edit', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('5df9b8a2-5469-4608-81f3-7d195a3b2e65', 'Editar comisiones', 'Acceso para modificar información de comisiones', 'commissions', 'edit', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('63427f87-aa21-4e26-b38a-4d546c3a8362', 'Eliminar categorías', 'Acceso para eliminar categorías del sistema', 'categories', 'delete', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('646bfaca-57bb-4eef-8070-96dd5845e517', 'Editar clientes', 'Acceso para modificar información de clientes', 'clients', 'edit', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('64d6b9a4-4850-43e7-bd10-6f39b7d0cbff', 'Crear servicios', 'Acceso para crear nuevos servicios en el sistema', 'services', 'create', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('670c8faa-b518-4763-9304-90cc7e83dabe', 'Crear propinas', 'Acceso para registrar nuevas propinas en el sistema', 'tips', 'create', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('6bbfd327-3558-4e81-9fac-a2b0229e33b9', 'Eliminar anticipos', 'Acceso para eliminar anticipos del sistema', 'advances', 'delete', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('6be77e9b-5258-42bd-ba5e-34b192ee4ac3', 'Activar usuarios', 'Acceso para activar usuarios deshabilitados', 'users', 'activate', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('6e9ac863-cda0-43b6-995c-12cf047d6eee', 'Ver reportes', 'Acceso para visualizar reportes del sistema', 'reports', 'view', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('75001a3b-517d-428b-8043-4c157b04b732', 'Crear clientes', 'Acceso para crear nuevos clientes en el sistema', 'clients', 'create', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('75a787b0-e49b-4725-86e5-fdc50b3818d0', 'Editar usuarios', 'Acceso para modificar información de usuarios', 'users', 'edit', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('761d2c17-d253-4b37-9991-5864cd39456f', 'Exportar reportes', 'Acceso para exportar reportes en diferentes formatos', 'reports', 'export', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('7d3df46d-edad-425d-a5cd-881c865b720d', 'Ver privados', 'Acceso para visualizar servicios de habitaciones privadas', 'private_rooms', 'view', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('814d8b48-b2df-42d7-9bb8-687197437f52', 'Editar habitaciones', 'Acceso para modificar información de habitaciones', 'rooms', 'edit', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('8600dd14-135d-441f-83ad-61d3189eee22', 'Ver caja', 'Acceso para visualizar el estado actual de la caja', 'cash_register', 'view', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('8e753a2c-ffe7-4857-bd69-e75e2d435bc5', 'Editar horas extras', 'Acceso para modificar información de horas extras', 'overtime', 'edit', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('917a7568-1819-4067-a86a-5986aa0e3bed', 'Cerrar caja', 'Acceso para cerrar la caja registradora del sistema', 'cash_register', 'close', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('923ab162-a367-4240-a07b-1af4116aca8e', 'Ver configuración', 'Acceso para visualizar la configuración del sistema', 'settings', 'view', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('93abd632-8863-4d9d-8e52-408b0c7d94cd', 'Distribuir propinas', 'Acceso para distribuir propinas entre empleados', 'tips', 'distribute', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('9aa5fdb9-7a0a-404c-8037-2f6b76f62e30', 'Editar roles', 'Acceso para modificar información de roles', 'roles', 'edit', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('9b742701-f143-481a-8efb-5f80df07d5c8', 'Ver pedidos', 'Acceso para visualizar todos los pedidos', 'orders', 'view', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('9d6e7d67-a465-4b86-a135-914593f89e30', 'Abrir caja', 'Acceso para abrir la caja registradora del sistema', 'cash_register', 'open', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('9dbfe095-0257-4ee3-b34b-42d4a6900017', 'Finalizar privados', 'Acceso para finalizar servicios de habitaciones privadas', 'private_rooms', 'finalize', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('9e1a00a9-9ed5-41e9-b597-aeb21baf7a42', 'Crear ventas', 'Acceso para crear nuevas ventas en el sistema', 'sales', 'create', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('9e51653e-a504-4cdc-a1ae-422c28c2385e', 'Retirar efectivo', 'Acceso para retirar efectivo de la caja', 'cash_register', 'withdraw', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('9ee5a439-ab97-410f-a1ed-59b91ec72d6e', 'Editar anticipos', 'Acceso para modificar información de anticipos', 'advances', 'edit', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('a1a6139d-60f8-446f-9518-80913511f1b4', 'Crear habitaciones', 'Acceso para crear nuevas habitaciones en el sistema', 'rooms', 'create', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('a42b3c21-cfd9-428e-a632-5765798298e5', 'Editar configuración', 'Acceso para modificar la configuración del sistema', 'settings', 'edit', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('a59fdb0c-e02e-4816-8202-417a9d87823b', 'Eliminar ventas', 'Acceso para eliminar ventas del sistema', 'sales', 'delete', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('a6f7b28b-8c11-4dcd-aed3-3906275233fd', 'Eliminar gratificaciones', 'Acceso para eliminar registros de gratificaciones', 'gratificaciones', 'delete', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('a7394593-1784-4388-a359-a594e45037bb', 'Ver reportes de ventas', 'Acceso para consultar reportes de ventas', 'sales', 'reports', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('a8569b9c-8912-4a67-8c1a-c9773830a6d6', 'Editar servicios', 'Acceso para modificar información de servicios', 'services', 'edit', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('a9c197fb-1e46-4afc-9a46-65ae23ed8aff', 'Ver asistencias', 'Acceso para visualizar todos los registros de asistencias', 'attendance', 'view', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('aa90142c-7de6-4cdd-9f35-5fe1b2b3e9e2', 'Crear comisiones', 'Acceso para crear nuevos registros de comisiones', 'commissions', 'create', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('afa9b2f6-d1c6-4d90-b4e1-0ec4e000cc8c', 'Editar gratificaciones', 'Acceso para modificar información de gratificaciones', 'gratificaciones', 'edit', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('b0736fc1-5edd-47d3-b0d2-164e2cc3acb3', 'Crear usuarios', 'Acceso para crear nuevos usuarios en el sistema', 'users', 'create', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('b3ed223d-d547-432a-9a37-249c13763cbe', 'Gestionar permisos', 'Acceso para asignar y gestionar permisos de roles', 'roles', 'permissions', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('b54ba825-b027-48e5-a82e-527feaec7bfb', 'Ver categorías', 'Acceso para visualizar todas las categorías', 'categories', 'view', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('b60701fa-ccbd-46f0-a1fe-f0739d2c73d4', 'Eliminar clientes', 'Acceso para eliminar clientes del sistema', 'clients', 'delete', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('b6d90e0d-94d9-44b7-a56a-bc222a153f30', 'Ver habitaciones', 'Acceso para visualizar todas las habitaciones', 'rooms', 'view', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('b6e40e50-465b-4419-8a1b-c407b4f00395', 'Editar pedidos', 'Acceso para modificar pedidos existentes', 'orders', 'edit', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('b9e41d5d-cf31-4bf2-84c5-7d6af56219d7', 'Ver cuentas', 'Acceso para visualizar todas las cuentas', 'accounts', 'view', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('ba986d57-791a-4b4e-8727-b777e0b3ff20', 'Ver propinas', 'Acceso para visualizar todos los registros de propinas', 'tips', 'view', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('bd72a8df-37ad-4b55-a6f2-0defd0ac5173', 'Crear privados', 'Acceso para crear servicios de habitaciones privadas', 'private_rooms', 'create', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('bdbd9586-70a3-444f-9dd6-7475b0363446', 'Crear anticipos', 'Acceso para crear nuevos anticipos en el sistema', 'advances', 'create', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('bedf373f-2044-4696-9311-f5f456f47820', 'Cobrar cuentas', 'Acceso para procesar cobros de cuentas', 'accounts', 'collect', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('c26a1a84-d9b8-495b-951c-c1fa89a9cfa8', 'Editar ventas', 'Acceso para modificar información de ventas', 'sales', 'edit', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('c33816c7-49ca-422d-aded-673c72c9c3d4', 'Activar roles', 'Acceso para activar roles deshabilitados', 'roles', 'activate', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('c46b7512-6b40-48f5-a67c-b15de0da1511', 'Eliminar devoluciones', 'Acceso para eliminar registros de devoluciones', 'returns', 'delete', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('c6852a24-418a-4658-b980-540ce8d2b726', 'Ver pagos', 'Acceso para visualizar todos los registros de pagos', 'payroll', 'view', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('c91bc682-4fc7-46b8-a74b-bcd2b9daa15c', 'Eliminar habitaciones', 'Acceso para eliminar habitaciones del sistema', 'rooms', 'delete', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('cfcc1b1e-09da-4ddd-877a-3a4120c5e4af', 'Desactivar roles', 'Acceso para desactivar roles del sistema', 'roles', 'deactivate', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('d1880d51-58ec-4eda-b7fd-1d97326b834f', 'Eliminar servicios', 'Acceso para eliminar servicios del sistema', 'services', 'delete', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('d296d908-c60f-4360-a359-861bc3a631fc', 'Procesar anticipos', 'Procesar anticipos', 'advances', 'process', '2026-05-22 06:39:57', '2026-05-22 06:39:57', NULL),
('d2dcbb35-9bbe-4035-bf06-f27026d6f71a', 'Ver roles', 'Acceso para visualizar todos los roles del sistema', 'roles', 'view', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('d34594bd-64c9-4ef9-ad80-1b1ad18c8d9f', 'Ver reportes de caja', 'Acceso para consultar reportes financieros de caja', 'cash_register', 'reports', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('d76b99a8-131b-4b8e-9203-e7e0af156e0b', 'Ver anticipos', 'Acceso para visualizar todos los anticipos', 'advances', 'view', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('d7cce40b-1355-45b4-8e1b-9426cade5e4e', 'Ver detalles gratificaciones', 'Acceso para ver detalles de gratificaciones por usuario', 'gratificaciones', 'view_details', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('e41b780d-74d5-4316-a614-86808f4dacd5', 'Ver gratificaciones', 'Acceso para visualizar todos los registros de gratificaciones', 'gratificaciones', 'view', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('e725e3dd-2650-41da-adb9-64df9097a14b', 'Eliminar propinas', 'Acceso para eliminar registros de propinas', 'tips', 'delete', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('e7f25f27-ee01-4932-a1d3-bddac7e6822b', 'Procesar pagos', 'Acceso para procesar pagos de trabajadores', 'payroll', 'process', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('f25a80d2-9a3b-4654-aa9c-6d23ef8f4c66', 'Eliminar horas extras', 'Acceso para eliminar registros de horas extras', 'overtime', 'delete', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('f51d4803-42b4-4baa-a613-ad294dc0aacd', 'Calcular pagos', 'Acceso para calcular pagos de trabajadores', 'payroll', 'calculate', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('f898a916-fc5c-49ac-8a55-9693a172d480', 'Eliminar pagos', 'Acceso para eliminar registros de pagos', 'payroll', 'delete', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('f8f83e81-eade-414e-85c4-6c7754cd2509', 'Ver comisiones', 'Acceso para visualizar todos los registros de comisiones', 'commissions', 'view', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('fcd74b42-4978-4cf6-b9ac-b7216a1d1243', 'Editar productos', 'Acceso para modificar información de productos', 'products', 'edit', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('fe886efa-4dd5-432d-bcf9-3a14d1e47e9a', 'Crear categorías', 'Acceso para crear nuevas categorías de productos', 'categories', 'create', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL);

INSERT INTO role_permissions (id, role_id, permission_id, created_at, updated_at) VALUES
('', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '3f4bf3c0-bab0-4f9e-9f5f-dac06f3d9901', '2026-03-16 16:08:25', '2026-03-16 16:08:25'),
('00d9e037-4d8d-4135-99fd-5060e164c0ab', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'c6852a24-418a-4658-b980-540ce8d2b726', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('0134da65-1638-460d-95d2-188d4f453804', '0b178ca4-559a-43f1-bacf-25cb7eecb3e2', 'f8f83e81-eade-414e-85c4-6c7754cd2509', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('018ce65c-7c90-40a7-908e-07594def4ea5', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', 'b6e40e50-465b-4419-8a1b-c407b4f00395', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('056634d0-77cb-4768-be92-fce8a87bac0b', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '4ea0a72e-6948-4168-a24f-e4e9ea61ff50', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('077ffa4a-201c-43a6-b3a2-c2efcb9d7ffa', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '3a2d75fe-61a0-4332-b5b3-59e647c4409a', '2026-05-22 06:39:58', '2026-05-22 06:39:58'),
('07bbaa37-e110-4add-9eca-20281f7be698', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '8600dd14-135d-441f-83ad-61d3189eee22', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('09897075-5bf1-479a-8de4-fded153ac493', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '3da800d8-d6d8-4e1b-84a8-3f9aa5b3347e', '2026-05-22 06:39:58', '2026-05-22 06:39:58'),
('0a727677-5f43-4b3a-aed4-8134ff3cccdf', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '9dbfe095-0257-4ee3-b34b-42d4a6900017', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('0a861a3f-0286-4980-bfbb-3b13955ca55d', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'fcd74b42-4978-4cf6-b9ac-b7216a1d1243', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('0aaad4c4-fa12-41ba-af50-e3af298e1ddf', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '1787b46b-78fe-4a8b-9dc4-571fa7e56c20', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('0caf357b-1cda-47c1-90a1-a36355a96325', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '28115302-66e3-432a-8a18-9e132ceed556', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('0d01d037-0bfc-49ef-a1ba-4fe67f11e75f', '0b178ca4-559a-43f1-bacf-25cb7eecb3e2', '3f4bf3c0-bab0-4f9e-9f5f-dac06f3d9901', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('0da6650d-c37d-4f10-9807-75e74f4ac31b', 'fbd81d2c-52fc-463b-b4cf-076fc9302e20', 'bdbd9586-70a3-444f-9dd6-7475b0363446', '2026-03-16 16:04:39', '2026-03-16 16:04:39'),
('11873c44-6127-404a-9371-5ce918cc3e2d', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '145bfa46-2b45-424c-9ee2-233a0a6973a0', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('18e1bfe7-1bf4-40ce-aa28-90b859d3d40e', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', 'd76b99a8-131b-4b8e-9203-e7e0af156e0b', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('197ea05f-0c1b-45a5-a189-5d2ab064ec95', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '4e0547d8-b16a-4bb4-9313-2b0637f8a14d', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('1c65ddf8-9b01-4731-b7cb-012d7971bbd1', 'fbd81d2c-52fc-463b-b4cf-076fc9302e20', '144321cb-2f96-4c27-a025-208bfcec01d3', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('1ce990d2-a378-4a61-81b5-ea070d43e1cb', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '50f47425-1305-41d8-8e48-66752616070e', '2026-05-22 06:39:36', '2026-05-22 06:39:36'),
('1ee6421b-a764-45a7-ad1f-fbd29e04bb2d', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '144321cb-2f96-4c27-a025-208bfcec01d3', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('1eea6bc0-cbd1-4169-9433-5101835e63c9', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'b54ba825-b027-48e5-a82e-527feaec7bfb', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('1ef00822-46ee-43dc-9a69-aec741caf578', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '191040bf-222c-4f15-b553-eb895b7b731a', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('1f01305a-cd4d-43ea-934f-5347f8a98351', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'b3ed223d-d547-432a-9a37-249c13763cbe', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('1f366183-3ecb-4ff7-8735-dfa0a7fbe248', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '75a787b0-e49b-4725-86e5-fdc50b3818d0', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('205fb5aa-df6a-4993-9731-520b7b4433aa', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '93abd632-8863-4d9d-8e52-408b0c7d94cd', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('24884edf-cd82-4acf-b22b-81258d44dde7', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '05334ab3-b304-444e-97e9-d2f4fe9c1727', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('24f6f25d-70fb-4751-b45b-08e5851972af', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '5386fcc0-f608-47be-a858-113d975c8292', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('27a2ce44-a502-4848-b960-be9d0d319615', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', 'b6d90e0d-94d9-44b7-a56a-bc222a153f30', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('27b27c73-9aab-4314-8c38-7c9ec5eefaaf', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'a59fdb0c-e02e-4816-8202-417a9d87823b', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('28ada67e-dbae-46f4-bb76-968ce98f5620', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'a42b3c21-cfd9-428e-a632-5765798298e5', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('28c27b74-0d4d-471a-867f-2fae4e4adebf', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', 'bd72a8df-37ad-4b55-a6f2-0defd0ac5173', '2026-05-22 06:40:00', '2026-05-22 06:40:00'),
('29873017-bede-4a21-825b-2fb4c5325ef0', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '9e51653e-a504-4cdc-a1ae-422c28c2385e', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('2a86e519-aaa1-4807-930c-3385cd2bdad6', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '488b28c7-a27c-4b9c-9dfc-727e292d006b', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('2ceefd86-6227-4dd9-ae39-602fca5eb87a', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '2ce981cc-ee3e-41cd-82ad-181827ff4070', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('2ec740de-9b0d-4b6f-8fb2-dbcbb82668b5', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'c46b7512-6b40-48f5-a67c-b15de0da1511', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('32003102-0ad0-41f2-ad7c-55ba2a532d49', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'b60701fa-ccbd-46f0-a1fe-f0739d2c73d4', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('32a2d315-7699-4a30-a0c1-2786a6f13727', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '08b5920d-e7b0-4e94-b906-42fbe3a08438', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('332cc9a7-0367-4b21-9e4f-49e5b3a50c8f', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '50f47425-1305-41d8-8e48-66752616070e', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('3355a420-04b4-43f3-8158-d3233528091d', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'fe886efa-4dd5-432d-bcf9-3a14d1e47e9a', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('3392e487-83ad-4346-9bd0-c3c6d1bc454a', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '43ac31fc-67ce-47e2-a221-6c4555a011cb', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('33b0ba3f-d8c1-4436-bb4c-eb73bdf1c143', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '1d5107c3-ffd7-48ce-b06c-be010233766b', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('36225d03-4fd2-4b42-a31e-a3246480b4da', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'd7cce40b-1355-45b4-8e1b-9426cade5e4e', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('388e3409-d908-4291-bfcd-7d0f4faa29fc', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'c26a1a84-d9b8-495b-951c-c1fa89a9cfa8', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('3bd8350b-71c2-408b-9a88-7526491c9389', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '6bbfd327-3558-4e81-9fac-a2b0229e33b9', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('3bfa2d50-ea1f-4345-bde4-6b8547bc2fad', 'fbd81d2c-52fc-463b-b4cf-076fc9302e20', '3f4bf3c0-bab0-4f9e-9f5f-dac06f3d9901', '2026-03-16 16:04:39', '2026-03-16 16:04:39'),
('3c30895f-bfc4-4efd-b018-7d38187787c6', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', 'f8f83e81-eade-414e-85c4-6c7754cd2509', '2026-05-22 06:39:59', '2026-05-22 06:39:59'),
('3d608f4b-8ed1-4ab6-8c70-82c533f60186', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '3de31373-cc05-4203-a7ec-376ec4823df0', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('41827c68-79e8-44ff-8557-a289b8c47580', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '144321cb-2f96-4c27-a025-208bfcec01d3', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('4401cfb5-88f1-44e2-889d-52d0c83e71a1', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', 'b9e41d5d-cf31-4bf2-84c5-7d6af56219d7', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('4483c00a-07d2-49c5-a3f5-119d42243846', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '145bfa46-2b45-424c-9ee2-233a0a6973a0', '2026-05-22 06:40:01', '2026-05-22 06:40:01'),
('45709f85-9695-4446-9c8d-1a5b66196c1d', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'afa9b2f6-d1c6-4d90-b4e1-0ec4e000cc8c', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('4782ac01-978c-44e5-8527-c28faa02674d', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'aa90142c-7de6-4cdd-9f35-5fe1b2b3e9e2', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('4971e805-0d33-4a51-bcaa-c63d50ab0d77', 'fbd81d2c-52fc-463b-b4cf-076fc9302e20', '64d6b9a4-4850-43e7-bd10-6f39b7d0cbff', '2026-03-16 16:04:39', '2026-03-16 16:04:39'),
('4ba21e61-43fe-4872-b7f5-7c78f0cf4803', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '05334ab3-b304-444e-97e9-d2f4fe9c1727', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('4bbf1c13-1a29-4c0b-a09d-08e4355392b9', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '469bdde8-11fa-4260-bdf7-e72736d0995f', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('4bbf8d9f-edfa-49ed-9e37-ece86b233f74', 'fbd81d2c-52fc-463b-b4cf-076fc9302e20', 'b54ba825-b027-48e5-a82e-527feaec7bfb', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('4d5b91b8-a6cc-4c57-a093-1d72437d5fa0', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'e7f25f27-ee01-4932-a1d3-bddac7e6822b', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('502ac74f-7d7a-4098-918b-2cbd51081e2e', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '50e30209-2afc-445c-ba21-0f5a0e7d82c3', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('51b53024-e26f-43f8-b8a0-d0ca0f506be8', '0b178ca4-559a-43f1-bacf-25cb7eecb3e2', 'bd72a8df-37ad-4b55-a6f2-0defd0ac5173', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('55448814-3b02-45f2-b7fb-91e0f4f27271', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '2a6f78d5-8292-4177-8980-50f270b06657', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('55afb7a7-08b8-4d70-b58b-1df13da208be', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '3dee3ac6-e672-4d03-8b66-a084b44ae044', '2026-05-22 06:39:36', '2026-05-22 06:39:36'),
('573f9006-3974-46f2-b9e0-3df23913d0da', '0b178ca4-559a-43f1-bacf-25cb7eecb3e2', '144321cb-2f96-4c27-a025-208bfcec01d3', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('596c96ac-33e1-424b-97f6-c05ac3d6e337', '0b178ca4-559a-43f1-bacf-25cb7eecb3e2', '7d3df46d-edad-425d-a5cd-881c865b720d', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('5c7fa5db-9016-460a-a904-8012d29c359d', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '27f9e876-ea6d-45ba-98ee-a3bd44403cd8', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('5e9931eb-8e53-4446-ab21-e4b991ef13ab', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'ba986d57-791a-4b4e-8727-b777e0b3ff20', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('6255aecf-959f-425d-8154-a0b2c85a0690', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', 'c26a1a84-d9b8-495b-951c-c1fa89a9cfa8', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('628f462a-1850-4838-b767-4d670a810c73', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '670c8faa-b518-4763-9304-90cc7e83dabe', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('64113d5c-3f0f-46cd-aed6-ebc6142afc2b', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '9e51653e-a504-4cdc-a1ae-422c28c2385e', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('66080ec5-48f0-46cd-af16-0f25b9d20398', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'd1880d51-58ec-4eda-b7fd-1d97326b834f', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('6674a683-76c6-4e1e-a6dd-48988983fb1a', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '8e753a2c-ffe7-4857-bd69-e75e2d435bc5', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('67737445-50f0-496b-8aee-a7e3d5210583', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '566c5910-abf5-4382-8768-fb65d81749e9', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('694b1cb5-d75d-4428-a1f6-acee7554bbb7', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '9ee5a439-ab97-410f-a1ed-59b91ec72d6e', '2026-05-22 06:39:38', '2026-05-22 06:39:38'),
('6a15be39-cd73-436a-b80d-d4975533041a', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '9e1a00a9-9ed5-41e9-b597-aeb21baf7a42', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('6b2fed1f-f8de-40c5-93a4-00e5968cefe8', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '6e9ac863-cda0-43b6-995c-12cf047d6eee', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('6d3f5a09-3fdb-4ad6-99fb-73d6f38ad9fb', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', 'e41b780d-74d5-4316-a614-86808f4dacd5', '2026-05-22 06:40:00', '2026-05-22 06:40:00'),
('7209e5be-2960-4a9e-b8ee-86bc809dfabb', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '41a21c0b-7fbc-46c1-b585-c19c8561126e', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('72718e77-817b-4cfe-bb6e-91fd80f412a8', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '36ef0033-2bc9-4f6e-840b-32496fc5fa9f', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('73379423-c1a9-4b66-9f22-34461cac4886', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '2f6300f4-a115-4e95-a5b1-2576bfcc9c1d', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('73e504db-2cbd-4102-9ce2-9b4883185e05', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'f25a80d2-9a3b-4654-aa9c-6d23ef8f4c66', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('75e67c6b-ab71-4693-af48-aff05e75720e', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '917a7568-1819-4067-a86a-5986aa0e3bed', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('778e708a-b277-48bb-b59e-a1dd02b547da', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '3da800d8-d6d8-4e1b-84a8-3f9aa5b3347e', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('79008e6d-b36d-4853-a7c8-6fd9a71e4e91', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'a1a6139d-60f8-446f-9518-80913511f1b4', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('7a579205-1252-414f-b0e0-14b9e0ae0982', 'fbd81d2c-52fc-463b-b4cf-076fc9302e20', '9b742701-f143-481a-8efb-5f80df07d5c8', '2026-03-16 16:04:39', '2026-03-16 16:04:39'),
('7a6c3575-85c6-4101-8d06-15216ecfbd43', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'a6f7b28b-8c11-4dcd-aed3-3906275233fd', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('7a923f7a-06f6-4dd0-8049-16d630c135b1', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '43ac31fc-67ce-47e2-a221-6c4555a011cb', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('7e98bc38-ec02-4887-98e5-1f63dc7ab881', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '6be77e9b-5258-42bd-ba5e-34b192ee4ac3', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('8169b0a3-ff80-4c53-a5df-108d826f529d', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '5df9b8a2-5469-4608-81f3-7d195a3b2e65', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('818a3064-a4b2-4d9b-aa1c-c077db3b044e', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'f51d4803-42b4-4baa-a613-ad294dc0aacd', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('823e9df0-597a-489c-8c48-06e3344732cc', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '41064d58-14fc-49f8-91de-9380c7657f45', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('826bb6bc-dfe9-4d24-856b-ca8ed1c55d2a', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '3a2d75fe-61a0-4332-b5b3-59e647c4409a', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('8345bacb-064f-4ea4-996c-0f4bab4fa3e9', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '75001a3b-517d-428b-8043-4c157b04b732', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('839895fc-30d2-4406-8f36-4c80a08b205b', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', 'a9c197fb-1e46-4afc-9a46-65ae23ed8aff', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('85e55bab-046e-45c4-8dd4-b4f1c58d0fc4', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '646bfaca-57bb-4eef-8070-96dd5845e517', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('861d17eb-f7cd-4070-b616-51ea47a953ec', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '9ee5a439-ab97-410f-a1ed-59b91ec72d6e', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('86f24b99-c4da-405b-a174-4328ed6ca18a', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'bdbd9586-70a3-444f-9dd6-7475b0363446', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('874ed56e-a468-4491-9ebe-269e0b5b4338', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'a8569b9c-8912-4a67-8c1a-c9773830a6d6', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('88b48d47-4d7a-4b21-a859-c1d1ddd51432', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'c91bc682-4fc7-46b8-a74b-bcd2b9daa15c', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('895ad27a-dc2e-46c0-9ddc-45aacff72431', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '3f4bf3c0-bab0-4f9e-9f5f-dac06f3d9901', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('8a98bead-fefa-4eb0-a79e-bcc1850c09ae', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '9b742701-f143-481a-8efb-5f80df07d5c8', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('8b44c719-9798-4672-aedb-883d33bec2b2', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'b6d90e0d-94d9-44b7-a56a-bc222a153f30', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('8beaaf90-f5e0-4f27-a573-86a1591890ff', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'c33816c7-49ca-422d-aded-673c72c9c3d4', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('8c106130-6387-4b80-995e-72b9a86f2f92', 'fbd81d2c-52fc-463b-b4cf-076fc9302e20', 'a9c197fb-1e46-4afc-9a46-65ae23ed8aff', '2026-03-16 16:04:39', '2026-03-16 16:04:39'),
('8e65c040-2be8-4cb9-9289-3317e7cb88a3', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'a9c197fb-1e46-4afc-9a46-65ae23ed8aff', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('8e783ab0-672e-4fa9-b4d2-7946b1a8acb1', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '1d5107c3-ffd7-48ce-b06c-be010233766b', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('90478d27-f2c6-4ffc-968b-1e3e5ab22c26', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '9d6e7d67-a465-4b86-a135-914593f89e30', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('9057611b-3390-4837-baf9-301b3780a9fb', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '75a787b0-e49b-4725-86e5-fdc50b3818d0', '2026-05-22 06:39:36', '2026-05-22 06:39:36'),
('9150100a-c677-44b3-9159-8d0099d6fd29', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '761d2c17-d253-4b37-9991-5864cd39456f', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('91532e25-5ef6-404f-be6a-ce39115bf579', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', 'd34594bd-64c9-4ef9-ad80-1b1ad18c8d9f', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('9344439d-8568-4cc1-9a35-2dbd00a09f7d', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', 'bdbd9586-70a3-444f-9dd6-7475b0363446', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('9417d045-bc02-42d3-9592-a34826717d45', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '7d3df46d-edad-425d-a5cd-881c865b720d', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('9c7db946-f0f3-4928-a4a5-a89f32647ea0', 'fbd81d2c-52fc-463b-b4cf-076fc9302e20', '566c5910-abf5-4382-8768-fb65d81749e9', '2026-03-16 16:04:39', '2026-03-16 16:04:39'),
('9cdb293a-6508-44de-9d63-720f39d1e0eb', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'a7394593-1784-4388-a359-a594e45037bb', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('9d0771b8-0c66-4568-bbc3-410f65f2235d', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'e41b780d-74d5-4316-a614-86808f4dacd5', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('9d4d1ff0-240d-4158-9c37-42a3a61c27ed', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '9d6e7d67-a465-4b86-a135-914593f89e30', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('9dbe458b-1b38-4177-851b-8f60a9d8851c', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', 'b54ba825-b027-48e5-a82e-527feaec7bfb', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('9f7fa9d4-cb89-4d6e-8d11-d257c10862e7', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'b0736fc1-5edd-47d3-b0d2-164e2cc3acb3', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('9ff12c43-c88e-4e76-b9a3-37b73c6ac2ac', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '4794ec44-c5fa-41c9-a320-13aa9fb9f96d', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('a1f8c9ae-1547-4565-8cf7-78d8a686e023', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'd34594bd-64c9-4ef9-ad80-1b1ad18c8d9f', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('a1fc916e-ce19-4a0c-a23b-28976aefd9d7', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '0fd0af1d-7082-4e4e-88e3-0d10a1a5256a', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('a5900304-7c53-4aff-894d-085bfd49c24a', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '75001a3b-517d-428b-8043-4c157b04b732', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('ab0f2277-a8a8-4cbd-99a8-d86c7abbc8b5', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', 'ba986d57-791a-4b4e-8727-b777e0b3ff20', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('aed60ea1-80bd-451a-a583-d6b3703ac9b4', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '9e1a00a9-9ed5-41e9-b597-aeb21baf7a42', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('af61358d-0f0d-4934-adb1-34c700f6ce06', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '2da2b944-aab4-4c60-bb06-024ba05d8959', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('b354e0dc-3813-4fcb-a4f9-e778b5c81eff', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'd76b99a8-131b-4b8e-9203-e7e0af156e0b', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('b3a12f6a-927b-4cc6-8e0e-9ab547bfb20d', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '208d766e-6d5b-477c-a7eb-e480bff7467e', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('c1474634-6140-4dfb-bd64-c5e510563958', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'f898a916-fc5c-49ac-8a55-9693a172d480', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('c47dcfb2-9004-4f66-84a8-41aee3a0a4c0', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '2fb6087c-8784-401f-908f-3a3e2c158a26', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('c53a2068-ce23-4bff-b7c8-628267a8db3a', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '5b040973-2dee-4b04-8d2d-d986c80f0d61', '2026-05-22 06:39:59', '2026-05-22 06:39:59'),
('c58d9a14-724a-48c2-b2df-1236dd2f41ca', 'fbd81d2c-52fc-463b-b4cf-076fc9302e20', 'b6e40e50-465b-4419-8a1b-c407b4f00395', '2026-03-16 16:04:39', '2026-03-16 16:04:39'),
('c9d21417-f2ca-4653-9f64-ee3513ea86ec', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '57a6c962-d262-4cda-bd7c-71e32fdb5b6c', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('cd9dad2a-054f-448a-8e38-8c56ca916de9', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '4bae7a62-c2f9-40df-b4b3-8a64df27ed61', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('d16cd048-1bdd-4161-aefd-8352dea5fef8', 'fbd81d2c-52fc-463b-b4cf-076fc9302e20', 'b6d90e0d-94d9-44b7-a56a-bc222a153f30', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('d21142f3-0611-4b22-be71-3b29fd348c28', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'b6e40e50-465b-4419-8a1b-c407b4f00395', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('d3e70fb9-93c2-4951-9640-2cccce408ec8', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'bd72a8df-37ad-4b55-a6f2-0defd0ac5173', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('d54d23f5-d7ce-4431-b1d6-2006074a0b36', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'b9e41d5d-cf31-4bf2-84c5-7d6af56219d7', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('d591dba1-946a-43cd-9f43-beb4f0f075dc', '0b178ca4-559a-43f1-bacf-25cb7eecb3e2', 'b6d90e0d-94d9-44b7-a56a-bc222a153f30', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('d6d45247-ad11-475c-b50e-1018a5773dbe', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '917a7568-1819-4067-a86a-5986aa0e3bed', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('d77d853f-e211-40a2-bd14-e24b149a12f7', 'fbd81d2c-52fc-463b-b4cf-076fc9302e20', '50e30209-2afc-445c-ba21-0f5a0e7d82c3', '2026-03-16 16:04:39', '2026-03-16 16:04:39'),
('d89b06b4-8d1a-4bab-b60c-811cce0ee483', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '566c5910-abf5-4382-8768-fb65d81749e9', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('d94b6623-c4f7-4dc5-9cfd-ca30c230adde', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '923ab162-a367-4240-a07b-1af4116aca8e', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('d96ef095-5ed6-46ca-849f-328e50d73bd5', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '814d8b48-b2df-42d7-9bb8-687197437f52', '2026-05-22 06:39:59', '2026-05-22 06:39:59'),
('da7351f9-3c94-4319-b291-437774ffe53b', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '9aa5fdb9-7a0a-404c-8037-2f6b76f62e30', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('dc08ff85-293f-4ca8-b678-cb1cf9e15fdc', 'fbd81d2c-52fc-463b-b4cf-076fc9302e20', 'd76b99a8-131b-4b8e-9203-e7e0af156e0b', '2026-03-16 16:04:39', '2026-03-16 16:04:39'),
('ddf2d717-9632-4bcd-9419-34994ca7e862', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '814d8b48-b2df-42d7-9bb8-687197437f52', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('de1c5d06-6fd2-4c90-b1b7-5c730900d337', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '2fb6087c-8784-401f-908f-3a3e2c158a26', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('e0def367-f178-445f-9924-d0a736eb8553', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '7d3df46d-edad-425d-a5cd-881c865b720d', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('e1eee036-2ddb-4df2-97c7-5ff006e0e6bf', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '0fd0af1d-7082-4e4e-88e3-0d10a1a5256a', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('e26c73e2-028a-40db-9d20-624a3480c5db', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '670c8faa-b518-4763-9304-90cc7e83dabe', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('e46bedd3-f27b-4443-b717-14ca2fb6a1d9', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '63427f87-aa21-4e26-b38a-4d546c3a8362', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('e4cde1a2-0499-4fba-899e-de0fa0baaafe', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '9dbfe095-0257-4ee3-b34b-42d4a6900017', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('e6854d93-7cde-4e75-aa8c-c42b3097ba5a', 'fbd81d2c-52fc-463b-b4cf-076fc9302e20', '191040bf-222c-4f15-b553-eb895b7b731a', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('e79fa2f0-6004-4143-8af5-c905942371c7', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'd2dcbb35-9bbe-4035-bf06-f27026d6f71a', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('e7e45249-2430-46e8-9ba6-81d7b590447a', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '3dee3ac6-e672-4d03-8b66-a084b44ae044', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('e94092a2-674a-4d64-8468-a2e15fca9cc4', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '3b154066-0f7e-486f-8e0b-b656338be78b', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('ea011594-9dff-42f6-991a-a33f834d2ee1', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '646bfaca-57bb-4eef-8070-96dd5845e517', '2026-05-22 06:39:37', '2026-05-22 06:39:37'),
('eb50c7a5-d72c-4ac3-9b30-769c04023d0b', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'cfcc1b1e-09da-4ddd-877a-3a4120c5e4af', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('eb6625c5-13b6-4b77-ab26-e09aa5aa49ef', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '9b742701-f143-481a-8efb-5f80df07d5c8', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('ec4ed94f-929b-4939-a40e-531ea2f55558', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', 'd296d908-c60f-4360-a359-861bc3a631fc', '2026-05-22 06:39:57', '2026-05-22 06:39:57'),
('ef398c13-65ee-4be2-bc8f-bfbb0ae9103b', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', 'b0736fc1-5edd-47d3-b0d2-164e2cc3acb3', '2026-05-22 06:39:36', '2026-05-22 06:39:36'),
('ef4f25bc-bbb2-4ee8-b718-7147cfa8906e', 'fbd81d2c-52fc-463b-b4cf-076fc9302e20', 'ba986d57-791a-4b4e-8727-b777e0b3ff20', '2026-03-16 16:04:39', '2026-03-16 16:04:39'),
('f00feb40-47b6-4ab0-aa0a-6bacf5705e33', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'bedf373f-2044-4696-9311-f5f456f47820', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('f1f79136-734a-487c-9222-7825bac97fea', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '8600dd14-135d-441f-83ad-61d3189eee22', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('f201baf3-5867-4a60-84cd-b2a86b3ba183', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'f8f83e81-eade-414e-85c4-6c7754cd2509', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('f29606ac-0952-47fc-a499-cee51a0c5c2b', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '208d766e-6d5b-477c-a7eb-e480bff7467e', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('f50a0216-fd37-4cc1-9f05-a580d44dad79', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '64d6b9a4-4850-43e7-bd10-6f39b7d0cbff', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('f55aa3ea-09e4-475c-b615-5cd5390392c7', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'e725e3dd-2650-41da-adb9-64df9097a14b', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('f5eaa7da-2d5d-4d5e-b453-268324595632', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '50e30209-2afc-445c-ba21-0f5a0e7d82c3', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('f63ad432-94d9-4340-9797-0727468785f9', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', 'a1a6139d-60f8-446f-9518-80913511f1b4', '2026-05-22 06:39:59', '2026-05-22 06:39:59'),
('f70ad152-86b2-4827-a66d-1200475dcd5b', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '191040bf-222c-4f15-b553-eb895b7b731a', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('fc3d2a55-c397-43e4-afdf-b76e3d97b7ca', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '5b040973-2dee-4b04-8d2d-d986c80f0d61', '2026-03-16 15:59:31', '2026-03-16 15:59:31');

INSERT INTO configuraciones (id, clave, valor, descripcion, categoria, tipo, fecha_crea, fecha_mod) VALUES
('a8d797b8-1bb1-4b25-99ba-ed94afdab710', 'asistencia_hora_inicio', '21', NULL, 'asistencia', 'number', '2026-07-11 09:50:08', '2026-09-19 17:12:51'),
('ee280d6e-1b14-4b21-830e-7b1e0a9d37d5', 'asistencia_hora_fin', '23', NULL, 'asistencia', 'number', '2026-07-11 09:50:09', '2026-09-19 17:12:51'),
('f7195551-2cec-11f1-8130-f83dc65328af', 'empresa_nombre', 'Las Muñecas de Ramón', 'Nombre de la empresa', 'empresa', 'text', '2026-03-31 06:32:46', NULL),
('f719aabd-2cec-11f1-8130-f83dc65328af', 'empresa_rut', '', 'RUT de la empresa', 'empresa', 'text', '2026-03-31 06:32:46', NULL),
('f719e05d-2cec-11f1-8130-f83dc65328af', 'empresa_direccion', '', 'Dirección de la empresa', 'empresa', 'text', '2026-03-31 06:32:46', NULL),
('f719e31f-2cec-11f1-8130-f83dc65328af', 'empresa_telefono', '', 'Teléfono de contacto', 'empresa', 'text', '2026-03-31 06:32:46', NULL),
('f719e3aa-2cec-11f1-8130-f83dc65328af', 'empresa_email', '', 'Email de contacto', 'empresa', 'text', '2026-03-31 06:32:46', NULL),
('f719e435-2cec-11f1-8130-f83dc65328af', 'empresa_facebook', '', 'Facebook URL', 'empresa', 'text', '2026-03-31 06:32:46', NULL),
('f719e4b1-2cec-11f1-8130-f83dc65328af', 'empresa_instagram', '', 'Instagram URL', 'empresa', 'text', '2026-03-31 06:32:46', NULL),
('f719e52c-2cec-11f1-8130-f83dc65328af', 'empresa_whatsapp', '', 'WhatsApp', 'empresa', 'text', '2026-03-31 06:32:46', NULL),
('f719e5b3-2cec-11f1-8130-f83dc65328af', 'impuesto_iva', '20', 'Porcentaje de IVA', 'facturacion', 'number', '2026-03-31 06:32:46', '2026-07-13 00:37:15'),
('f719e636-2cec-11f1-8130-f83dc65328af', 'impuesto_propina', '10', 'Porcentaje de propina por defecto', 'facturacion', 'number', '2026-03-31 06:32:46', '2026-07-13 00:37:15'),
('f719e6b7-2cec-11f1-8130-f83dc65328af', 'moneda', 'CLP', 'Código de moneda', 'facturacion', 'text', '2026-03-31 06:32:46', '2026-07-13 00:37:15'),
('f719e730-2cec-11f1-8130-f83dc65328af', 'facturacion_activada', 'true', 'Si la facturación está activa', 'facturacion', 'boolean', '2026-03-31 06:32:46', '2026-07-13 00:37:15'),
('f719e7ab-2cec-11f1-8130-f83dc65328af', 'resolucion_sii', '', 'Número de resolución SII', 'facturacion', 'text', '2026-03-31 06:32:46', '2026-07-13 00:37:15'),
('f719e832-2cec-11f1-8130-f83dc65328af', 'ambiente', 'produccion', 'Ambiente: desarrollo o produccion', 'sistema', 'text', '2026-03-31 06:32:46', NULL),
('f719e8a9-2cec-11f1-8130-f83dc65328af', 'timezone', 'America/Santiago', 'Zona horaria', 'sistema', 'text', '2026-03-31 06:32:46', NULL);

INSERT INTO habitaciones (id_habitacion, nombre, display_order, precio, tiempo, comision_anfitriona, estado, fecha_crea, fecha_mod, fecha_baja) VALUES
('38699f74-2717-465b-a6c4-dcfa0ce8c319', 'Vip 3', 0, 0, 0, NULL, 1, '2026-07-13 01:27:40', '2026-08-08 17:46:28', NULL),
('40866998-ba4a-47e2-96f8-edf9b299189a', 'Privado 1', 1, 30000, 2, NULL, 1, '2026-05-21 23:32:30', '2026-08-08 17:46:28', NULL),
('40d6da04-b563-4fba-b698-5fe46e67d857', 'Vip 2', 0, 0, 0, 0, 1, '2026-07-13 00:38:30', '2026-08-08 17:46:28', NULL),
('49a38e08-e87a-4c6c-a091-15fe770d350c', 'Privado 3', 3, 30000, 2, NULL, 1, '2026-05-21 23:33:17', '2026-08-08 17:46:28', NULL),
('6b2842aa-2b1d-4e62-8d65-3528617d3b15', 'Vip 1', 4, 0, 0, 0, 1, '2026-05-21 23:33:53', '2026-08-08 17:46:28', NULL),
('7170a56b-6b4d-4e5a-a333-3e9807bc5206', 'Privado 5', 5, 30000, 2, NULL, 1, '2026-05-21 23:34:22', '2026-08-08 17:46:28', NULL),
('c3c383c5-5136-4513-9444-7d236ea8a913', 'Jacuzzi 6', 6, 500000, 15, 100000, 1, '2026-05-21 23:34:49', '2026-08-08 17:46:28', NULL),
('cc44f542-a0f5-48c8-a239-d1040cce2c0f', 'Privado 2', 2, 30000, 2, NULL, 1, '2026-05-21 23:32:48', '2026-08-08 17:46:28', NULL);

INSERT INTO categorias (id_categoria, nombre, descripcion, estado, fecha_crea, fecha_mod, fecha_baja, display_order) VALUES
('06552233-2400-40ad-bd1d-fffe2769fe74', 'Trago Chica', 'Trago chica', 1, '2026-05-21 23:14:50', '2026-07-20 09:33:07', NULL, 0),
('32f29d6e-dcb0-45b2-8d07-9ff9ba876926', 'Wisky Trago', '', 1, '2026-05-21 23:13:11', '2026-07-20 09:33:07', NULL, 2),
('4101431f-c5d0-4745-8252-6d8707847d69', 'Champaña', '', 1, '2026-05-21 23:12:54', '2026-07-20 09:33:07', NULL, 3),
('ab4206d5-b6c0-439b-84d8-5f2326ffd74d', 'Cervezas', '', 1, '2026-05-21 23:12:34', '2026-07-20 09:33:07', NULL, 1);

INSERT INTO productos (id_producto, codigo, nombre, categoria_id, display_order, precio, comision, descripcion, fecha_crea, fecha_mod, fecha_baja, estado, foto) VALUES
('258d0063-81a3-48c1-b3bb-af83859bb3df', '98F59VOC', 'Champaña $120.000', '4101431f-c5d0-4745-8252-6d8707847d69', 1, 120000, 40000, 'Champaña chicas', '2026-05-21 23:41:17', '2026-05-22 00:57:20', NULL, 1, 'product_1779421276990.webp'),
('2cd4a2ba-f015-4664-9247-81de487c7335', 'V2SLT7FC', 'Corona 330ml', 'ab4206d5-b6c0-439b-84d8-5f2326ffd74d', 1, 10000, 0, 'Cerveza cliente', '2026-05-21 23:18:21', '2026-07-13 05:37:10', NULL, 1, 'product_2cd4a2ba-f015-4664-9247-81de487c7335_1783935430219.webp'),
('511697be-1839-44ed-960b-d1dbd4a3f99e', '5CZMO95O', 'Trago $30.000', '06552233-2400-40ad-bd1d-fffe2769fe74', 2, 30000, 10000, 'Trago $30.000', '2026-05-21 23:48:10', '2026-05-21 23:49:20', NULL, 1, 'product_1779421690206.webp'),
('7f1e2214-e07a-493e-87ee-f4565ec170a1', 'GNQMQZC2', 'Trago $40.000', '06552233-2400-40ad-bd1d-fffe2769fe74', 3, 40000, 15000, 'Ttrago chica', '2026-05-21 23:49:06', '2026-05-21 23:49:20', NULL, 1, 'product_1779421746149.webp'),
('8b1d4b9a-9b35-4fe7-9cb3-55b0dda5991c', 'TWJAMQ20', 'Champaña $200.000', '4101431f-c5d0-4745-8252-6d8707847d69', 3, 200000, 80000, 'Champaña chicas', '2026-05-21 23:43:43', '2026-05-21 23:45:32', NULL, 1, 'product_1779421422966.webp'),
('9ef83b37-47c0-4c42-919e-312a949e2006', 'EUQKVVJW', 'Jhony Walker Red Label', '32f29d6e-dcb0-45b2-8d07-9ff9ba876926', 0, 10000, 0, 'Wisky rojo cliente', '2026-05-21 23:52:52', NULL, NULL, 1, 'product_1779421970432.webp'),
('b26bc303-2b2a-4f4c-966a-e55df36e4a2e', 'SO5P4ELX', 'Champaña $160.000', '4101431f-c5d0-4745-8252-6d8707847d69', 2, 160000, 60000, 'Champaña chicas', '2026-05-21 23:42:16', '2026-05-21 23:45:32', NULL, 1, 'product_1779421336111.webp'),
('b5b86489-0b94-440f-ae7b-0823793f53cf', 'DWKQ6FZ0', 'Heineken 330ml', 'ab4206d5-b6c0-439b-84d8-5f2326ffd74d', 3, 10000, 0, 'Cerveza indivicual cliente', '2026-05-21 23:29:58', '2026-05-22 02:58:20', NULL, 1, 'product_b5b86489-0b94-440f-ae7b-0823793f53cf_1779432694165.webp'),
('c6403a4b-d560-48da-872f-90bbf5476221', 'HDPPN5M6', 'Trago $20.000', '06552233-2400-40ad-bd1d-fffe2769fe74', 1, 20000, 7000, 'Trago chica', '2026-05-21 23:47:22', '2026-05-21 23:49:20', NULL, 1, 'product_1779421642355.webp'),
('cba22e0d-943a-4a2f-9158-6d12b03cca57', '9S0JLCNF', 'Champaña $240.000', '4101431f-c5d0-4745-8252-6d8707847d69', 4, 240000, 100000, 'Champaña chicas', '2026-05-21 23:44:58', '2026-05-21 23:45:32', NULL, 1, 'product_cba22e0d-943a-4a2f-9158-6d12b03cca57_1779421520425.webp'),
('dedd81c0-ff6b-467f-a58d-82a56edd3972', 'IV7Y3PO4', 'Paceña', 'ab4206d5-b6c0-439b-84d8-5f2326ffd74d', 2, 10000, 0, '', '2026-05-22 00:30:54', '2026-05-22 02:58:20', NULL, 1, 'product_1779424250532.webp');

-- Admin semilla: contraseña inicial 'Cambio2026!' (force_password_change = 1).
-- Verla cambiada en el primer login; no usada por ninguna persona real.
INSERT INTO usuarios (id_usuario, run, nick, nombre, apellido, direccion, telefono, estado_civil, afp, aporte, sueldo, descuento, email, password, rol_id, foto, estado, estado_servicio, fecha_crea, fecha_mod, fecha_baja, push_token, qr_token, force_password_change) VALUES
('00000000-0000-0000-0000-000000000001', '00000000-0', 'Admin', 'Administrador', 'Semilla', '-', '-', '-', 'N/A', 0, 0, 0, 'admin@localhost', '$argon2id$v=19$m=65536,t=3,p=4$mxfz3fcQghXvWPBAhOsALg$umrx4x8UJWWhUCQXp/GZrmzQM9qfN/QtcqLy88F3ruY', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'default.png', 1, 1, CURRENT_TIMESTAMP, NULL, NULL, NULL, NULL, 1);


ALTER TABLE anticipos ADD PRIMARY KEY (id_anticipo);
CREATE INDEX idx_entregado_por ON anticipos (entregado_por);
CREATE INDEX idx_anticipos_usuario_estado ON anticipos (usuario_id,estado);
CREATE INDEX idx_anticipos_fecha_crea ON anticipos (fecha_crea DESC);
ALTER TABLE anticipo_historial ADD PRIMARY KEY (id);
CREATE INDEX fk_anticipo_historial_anticipo_id ON anticipo_historial (anticipo_id);
CREATE INDEX fk_anticipo_historial_usuario_id ON anticipo_historial (usuario_id);
ALTER TABLE asistencias ADD PRIMARY KEY (id_asistencia);
CREATE INDEX idx_asistencias_usuario_estado ON asistencias (usuario_id,estado);
ALTER TABLE audit_logs ADD PRIMARY KEY (id);
ALTER TABLE cajas ADD PRIMARY KEY (id_caja);
CREATE INDEX idx_cajas_estado ON cajas (estado);
ALTER TABLE categorias ADD PRIMARY KEY (id_categoria);
ALTER TABLE clientes ADD PRIMARY KEY (id_cliente);
ALTER TABLE clientes_prepago_movimientos ADD PRIMARY KEY (id_movimiento);
CREATE INDEX fk_prepago_cliente ON clientes_prepago_movimientos (cliente_id);
ALTER TABLE codigos ADD PRIMARY KEY (id_codigo);
ALTER TABLE comisiones ADD PRIMARY KEY (id_comision);
CREATE INDEX idx_comisiones_venta_id ON comisiones (venta_id);
CREATE INDEX idx_comisiones_servicio_id ON comisiones (servicio_id);
ALTER TABLE configuraciones ADD PRIMARY KEY (id);
ALTER TABLE configuraciones ADD CONSTRAINT unique_configuraciones_clave UNIQUE (clave);
CREATE INDEX idx_categoria ON configuraciones (categoria);
ALTER TABLE cuentas ADD PRIMARY KEY (id_cuenta);
CREATE INDEX fk_cuentas_cliente_id ON cuentas (cliente_id);
CREATE INDEX fk_cuentas_created_by ON cuentas (created_by);
ALTER TABLE cuentas_usuarios ADD PRIMARY KEY (id_cuenta_usuario);
CREATE INDEX fk_cuentas_usuarios_cuenta_id ON cuentas_usuarios (cuenta_id);
ALTER TABLE detalle_comisiones ADD PRIMARY KEY (id_detalle_comision);
CREATE INDEX fk_detalle_comisiones_comision_id ON detalle_comisiones (comision_id);
CREATE INDEX idx_detalle_comisiones_usuario_id ON detalle_comisiones (usuario_id);
ALTER TABLE detalle_cuentas ADD PRIMARY KEY (id_detalle_cuenta);
CREATE INDEX fk_detalle_cuentas_cuenta_id ON detalle_cuentas (cuenta_id);
ALTER TABLE detalle_devoluciones_servicios ADD PRIMARY KEY (id_detalle_devolucion);
CREATE INDEX fk_detalle_devoluciones_servicios_devolucion_servicio_id ON detalle_devoluciones_servicios (devolucion_servicio_id);
ALTER TABLE detalle_devoluciones_ventas ADD PRIMARY KEY (id_detalle_devolucion);
CREATE INDEX fk_detalle_devoluciones_ventas_devolucion_venta_id ON detalle_devoluciones_ventas (devolucion_venta_id);
ALTER TABLE detalle_pedidos ADD PRIMARY KEY (id_detalle_pedido);
CREATE INDEX fk_detalle_pedidos_habitacion_id ON detalle_pedidos (habitacion_id);
CREATE INDEX fk_detalle_pedidos_pedido_id ON detalle_pedidos (pedido_id);
ALTER TABLE detalle_pedidos_anfitrionas ADD PRIMARY KEY (id_detalle_anfitriona);
ALTER TABLE detalle_propinas ADD PRIMARY KEY (id_detalle_propina);
CREATE INDEX idx_detalle_propinas_usuario_id ON detalle_propinas (usuario_id);
ALTER TABLE detalle_servicios ADD PRIMARY KEY (id_detalle_servicio);
CREATE INDEX idx_detalle_servicios_servicio_id ON detalle_servicios (servicio_id);
CREATE INDEX idx_detalle_servicios_usuario_id ON detalle_servicios (usuario_id);
ALTER TABLE detalle_servicios_clientes ADD PRIMARY KEY (id);
ALTER TABLE detalle_ventas ADD PRIMARY KEY (id_detalle_venta);
CREATE INDEX idx_detalle_ventas_venta_id ON detalle_ventas (venta_id);
CREATE INDEX idx_detalle_ventas_producto_id ON detalle_ventas (producto_id);
CREATE INDEX idx_detalle_ventas_hostess_id ON detalle_ventas (hostess_id);
ALTER TABLE devoluciones_servicios ADD PRIMARY KEY (id_devolucion);
CREATE INDEX fk_devoluciones_servicios_cliente_id ON devoluciones_servicios (cliente_id);
CREATE INDEX fk_devoluciones_servicios_pieza_id ON devoluciones_servicios (pieza_id);
ALTER TABLE devoluciones_ventas ADD PRIMARY KEY (id_devolucion_venta);
CREATE INDEX fk_devoluciones_ventas_cliente_id ON devoluciones_ventas (cliente_id);
ALTER TABLE devoluciones_ventas_usuarios ADD PRIMARY KEY (id_devolucion_usuario);
CREATE INDEX fk_devoluciones_ventas_usuarios_detalle_devolucion_venta_id ON devoluciones_ventas_usuarios (detalle_devolucion_venta_id);
ALTER TABLE error_logs ADD PRIMARY KEY (id);
ALTER TABLE gratificaciones ADD PRIMARY KEY (id);
CREATE INDEX idx_gratificaciones_usuario ON gratificaciones (usuario_id);
ALTER TABLE habitaciones ADD PRIMARY KEY (id_habitacion);
ALTER TABLE horas_extras ADD PRIMARY KEY (id_hora_extra);
CREATE INDEX idx_horas_extras_usuario_id ON horas_extras (usuario_id);
ALTER TABLE logins ADD PRIMARY KEY (id_login);
CREATE INDEX fk_login_usuarios ON logins (usuario_id);
ALTER TABLE notificaciones ADD PRIMARY KEY (id);
CREATE INDEX idx_usuario_leida ON notificaciones (usuario_id,leida);
CREATE INDEX idx_rol_leida ON notificaciones (rol_destinatario,leida);
ALTER TABLE pedidos ADD PRIMARY KEY (id_pedido);
CREATE INDEX fk_pedidos_cliente_id ON pedidos (cliente_id);
CREATE INDEX idx_pedidos_estado ON pedidos (estado);
CREATE INDEX idx_pedidos_mesero_id ON pedidos (mesero_id);
ALTER TABLE pedidos_usuarios ADD PRIMARY KEY (id_pedido_usuario);
CREATE INDEX fk_pedidos_usuarios_pedido_id ON pedidos_usuarios (pedido_id);
CREATE INDEX idx_pedidos_usuarios_usuario_id ON pedidos_usuarios (usuario_id);
ALTER TABLE permissions ADD PRIMARY KEY (id);
ALTER TABLE permissions ADD CONSTRAINT unique_permission UNIQUE (module,action);
ALTER TABLE productos ADD PRIMARY KEY (id_producto);
ALTER TABLE propinas ADD PRIMARY KEY (id_propina);
CREATE INDEX idx_propinas_venta_id ON propinas (venta_id);
ALTER TABLE query_logs ADD PRIMARY KEY (id);
CREATE INDEX idx_query_logs_created_at ON query_logs (created_at);
CREATE INDEX idx_query_logs_duration_ms ON query_logs (duration_ms);
CREATE INDEX idx_query_logs_type ON query_logs (query_type);
ALTER TABLE retiros_caja ADD PRIMARY KEY (id_retiro);
CREATE INDEX fk_retiros_caja_caja_id ON retiros_caja (caja_id);
ALTER TABLE roles ADD PRIMARY KEY (id_rol);
ALTER TABLE role_permissions ADD PRIMARY KEY (id);
ALTER TABLE role_permissions ADD CONSTRAINT unique_role_permission UNIQUE (role_id,permission_id);
ALTER TABLE servicios ADD PRIMARY KEY (id_servicio);
CREATE INDEX fk_servicios_created_by ON servicios (created_by);
CREATE INDEX idx_servicios_estado_fecha ON servicios (estado,fecha_crea);
CREATE INDEX idx_servicios_caja_estado_fecha ON servicios (caja_id,estado,fecha_crea);
ALTER TABLE servicio_logs ADD PRIMARY KEY (id);
ALTER TABLE solicitudes_anticipos ADD PRIMARY KEY (id_solicitud);
CREATE INDEX fk_solicitudes_anticipos_usuario_id ON solicitudes_anticipos (usuario_id);
ALTER TABLE solicitudes_anulacion_cuentas ADD PRIMARY KEY (id);
CREATE INDEX idx_solicitudes_anulacion_cuentas_cuenta ON solicitudes_anulacion_cuentas (cuenta_id);
CREATE INDEX idx_solicitudes_anulacion_cuentas_estado ON solicitudes_anulacion_cuentas (estado);
ALTER TABLE solicitudes_anulacion_servicios ADD PRIMARY KEY (id);
CREATE INDEX fk_solicitudes_anulacion_servicios_servicio_id ON solicitudes_anulacion_servicios (servicio_id);
ALTER TABLE solicitudes_anulacion_ventas ADD PRIMARY KEY (id);
CREATE INDEX fk_solicitudes_anulacion_venta_id ON solicitudes_anulacion_ventas (venta_id);
ALTER TABLE solicitudes_atencion ADD PRIMARY KEY (id);
ALTER TABLE solicitudes_servicios ADD PRIMARY KEY (id_solicitud);
CREATE INDEX fk_solicitudes_servicios_procesado_por ON solicitudes_servicios (procesado_por);
CREATE INDEX fk_solicitudes_servicios_solicitado_por ON solicitudes_servicios (solicitado_por);
CREATE INDEX idx_solicitudes_servicios_estado ON solicitudes_servicios (estado);
ALTER TABLE usuarios ADD PRIMARY KEY (id_usuario);
CREATE INDEX fk_usuarios_rol_id ON usuarios (rol_id);
CREATE INDEX idx_usuarios_fecha_crea ON usuarios (fecha_crea DESC);
ALTER TABLE ventas ADD PRIMARY KEY (id_venta);
CREATE INDEX fk_ventas_created_by ON ventas (created_by);
CREATE INDEX idx_ventas_estado_fecha ON ventas (estado,fecha_crea);
CREATE INDEX idx_ventas_caja_estado_fecha ON ventas (caja_id,estado,fecha_crea);
ALTER TABLE ventas_usuarios ADD PRIMARY KEY (id_usuario_venta);
CREATE INDEX fk_ventas_usuarios_usuario_id ON ventas_usuarios (usuario_id);
CREATE INDEX fk_ventas_usuarios_venta_id ON ventas_usuarios (venta_id);
ALTER TABLE venta_logs ADD PRIMARY KEY (id);
CREATE INDEX venta_id ON venta_logs (venta_id);
ALTER TABLE _migrations ADD PRIMARY KEY (id);
ALTER TABLE _migrations ADD CONSTRAINT unique__migrations_filename UNIQUE (filename);
ALTER TABLE anticipo_historial ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE anticipo_historial ALTER COLUMN id RESTART WITH 1;
ALTER TABLE query_logs ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE query_logs ALTER COLUMN id RESTART WITH 1;
ALTER TABLE _migrations ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE _migrations ALTER COLUMN id RESTART WITH 1;
ALTER TABLE anticipo_historial ADD CONSTRAINT fk_anticipo_historial_anticipo FOREIGN KEY (anticipo_id) REFERENCES anticipos (id_anticipo) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE anticipo_historial ADD CONSTRAINT fk_anticipo_historial_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id_usuario) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE clientes_prepago_movimientos ADD CONSTRAINT fk_prepago_cliente FOREIGN KEY (cliente_id) REFERENCES clientes (id_cliente);
ALTER TABLE cuentas ADD CONSTRAINT fk_cuentas_cliente_id FOREIGN KEY (cliente_id) REFERENCES clientes (id_cliente) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE cuentas ADD CONSTRAINT fk_cuentas_created_by FOREIGN KEY (created_by) REFERENCES usuarios (id_usuario);
ALTER TABLE cuentas_usuarios ADD CONSTRAINT fk_cuentas_usuarios_cuenta_id FOREIGN KEY (cuenta_id) REFERENCES cuentas (id_cuenta) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE detalle_comisiones ADD CONSTRAINT fk_detalle_comisiones_comision_id FOREIGN KEY (comision_id) REFERENCES comisiones (id_comision) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE detalle_cuentas ADD CONSTRAINT fk_detalle_cuentas_cuenta_id FOREIGN KEY (cuenta_id) REFERENCES cuentas (id_cuenta) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE detalle_devoluciones_servicios ADD CONSTRAINT fk_detalle_devoluciones_servicios_devolucion_servicio_id FOREIGN KEY (devolucion_servicio_id) REFERENCES devoluciones_servicios (id_devolucion) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE detalle_devoluciones_ventas ADD CONSTRAINT fk_detalle_devoluciones_ventas_devolucion_venta_id FOREIGN KEY (devolucion_venta_id) REFERENCES devoluciones_ventas (id_devolucion_venta) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE detalle_pedidos ADD CONSTRAINT fk_detalle_pedidos_habitacion FOREIGN KEY (habitacion_id) REFERENCES habitaciones (id_habitacion) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE detalle_pedidos ADD CONSTRAINT fk_detalle_pedidos_pedido_id FOREIGN KEY (pedido_id) REFERENCES pedidos (id_pedido) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE devoluciones_servicios ADD CONSTRAINT fk_devoluciones_servicios_cliente_id FOREIGN KEY (cliente_id) REFERENCES clientes (id_cliente) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE devoluciones_servicios ADD CONSTRAINT fk_devoluciones_servicios_pieza_id FOREIGN KEY (pieza_id) REFERENCES habitaciones (id_habitacion) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE devoluciones_ventas ADD CONSTRAINT fk_devoluciones_ventas_cliente_id FOREIGN KEY (cliente_id) REFERENCES clientes (id_cliente) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE devoluciones_ventas_usuarios ADD CONSTRAINT fk_devoluciones_ventas_usuarios_detalle_devolucion_venta_id FOREIGN KEY (detalle_devolucion_venta_id) REFERENCES detalle_devoluciones_ventas (id_detalle_devolucion) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE gratificaciones ADD CONSTRAINT fk_gratificaciones_solicitante FOREIGN KEY (solicitante_id) REFERENCES usuarios (id_usuario) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE logins ADD CONSTRAINT fk_login_usuarios FOREIGN KEY (usuario_id) REFERENCES usuarios (id_usuario);
ALTER TABLE pedidos ADD CONSTRAINT fk_pedidos_cliente_id FOREIGN KEY (cliente_id) REFERENCES clientes (id_cliente) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE pedidos_usuarios ADD CONSTRAINT fk_pedidos_usuarios_pedido_id FOREIGN KEY (pedido_id) REFERENCES pedidos (id_pedido) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE retiros_caja ADD CONSTRAINT fk_retiros_caja_caja_id FOREIGN KEY (caja_id) REFERENCES cajas (id_caja) ON DELETE CASCADE ON UPDATE CASCADE;

-- Relaciones de las tablas de inventario y champagne. Se declaran aqui, junto al
-- resto de los FOREIGN KEY, porque los PRIMARY KEY de las tablas padre tambien
-- se crean en esta seccion final: un REFERENCES inline no se puede resolver.
ALTER TABLE producto_champagne_tiers ADD CONSTRAINT fk_champagne_tiers_producto FOREIGN KEY (producto_id) REFERENCES productos (id_producto) ON DELETE CASCADE;
ALTER TABLE inventario_presentaciones ADD CONSTRAINT fk_inv_pres_producto FOREIGN KEY (producto_id) REFERENCES productos (id_producto) ON DELETE CASCADE;
ALTER TABLE inventario_unidades ADD CONSTRAINT fk_inv_unid_producto FOREIGN KEY (producto_id) REFERENCES productos (id_producto) ON DELETE CASCADE;
ALTER TABLE inventario_unidades ADD CONSTRAINT fk_inv_unid_presentacion FOREIGN KEY (presentacion_id) REFERENCES inventario_presentaciones (id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION solicitudes_anulacion_servicios_fecha_solicitud_touch() RETURNS trigger AS $$
BEGIN
  NEW.fecha_solicitud = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_solicitudes_anulacion_servicios_fecha_solicitud_touch
  BEFORE UPDATE ON solicitudes_anulacion_servicios
  FOR EACH ROW EXECUTE FUNCTION solicitudes_anulacion_servicios_fecha_solicitud_touch();

COMMIT;