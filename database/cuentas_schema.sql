-- Esquema para el módulo de cuentas
-- Este archivo contiene las definiciones de las tablas cuentas, detalle_cuentas y cuentas_usuarios

-- Tabla principal de cuentas
CREATE TABLE IF NOT EXISTS cuentas (
  id_cuenta INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(50) NOT NULL UNIQUE,
  cliente_id INT NOT NULL,
  total_comision DECIMAL(10,2) DEFAULT 0.00,
  habitacion_id INT NULL,
  sub_total DECIMAL(10,2) DEFAULT 0.00,
  total DECIMAL(10,2) DEFAULT 0.00,
  pedido_id INT NULL,
  servicio_id INT NULL,
  fecha_crea TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  estado TINYINT DEFAULT 1 COMMENT '1: activa, 0: cerrada, -1: eliminada',
  
  -- Índices para mejorar rendimiento
  INDEX idx_cliente_id (cliente_id),
  INDEX idx_habitacion_id (habitacion_id),
  INDEX idx_pedido_id (pedido_id),
  INDEX idx_servicio_id (servicio_id),
  INDEX idx_estado (estado),
  INDEX idx_fecha_crea (fecha_crea),
  
  -- Claves foráneas
  FOREIGN KEY (cliente_id) REFERENCES clientes(id_cliente) ON DELETE RESTRICT,
  FOREIGN KEY (habitacion_id) REFERENCES habitaciones(id_habitacion) ON DELETE SET NULL,
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE SET NULL,
  FOREIGN KEY (servicio_id) REFERENCES servicios(id_servicio) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de detalles de cuentas
CREATE TABLE IF NOT EXISTS detalle_cuentas (
  id_detalle_cuenta INT AUTO_INCREMENT PRIMARY KEY,
  cuenta_id INT NOT NULL,
  producto_id INT NOT NULL,
  precio DECIMAL(10,2) NOT NULL,
  cantidad INT NOT NULL DEFAULT 1,
  sub_total DECIMAL(10,2) NOT NULL,
  comision DECIMAL(10,2) DEFAULT 0.00,
  
  -- Índices
  INDEX idx_cuenta_id (cuenta_id),
  INDEX idx_producto_id (producto_id),
  
  -- Claves foráneas
  FOREIGN KEY (cuenta_id) REFERENCES cuentas(id_cuenta) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id_producto) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de relación cuentas-usuarios
CREATE TABLE IF NOT EXISTS cuentas_usuarios (
  id_cuenta_usuario INT AUTO_INCREMENT PRIMARY KEY,
  cuenta_id INT NOT NULL,
  usuario_id INT NOT NULL,
  
  -- Índices
  INDEX idx_cuenta_id (cuenta_id),
  INDEX idx_usuario_id (usuario_id),
  UNIQUE KEY unique_cuenta_usuario (cuenta_id, usuario_id),
  
  -- Claves foráneas
  FOREIGN KEY (cuenta_id) REFERENCES cuentas(id_cuenta) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id_usuario) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Datos de prueba para el módulo de cuentas
-- Este script inserta datos de prueba para demostrar la funcionalidad

-- Insertar cuentas de prueba
INSERT INTO cuentas (codigo, cliente_id, total_comision, habitacion_id, sub_total, total, pedido_id, servicio_id, estado) VALUES
('CUENTA-001', 1, 5000.00, 1, 25000.00, 30000.00, NULL, NULL, 1),
('CUENTA-002', 2, 3000.00, 2, 15000.00, 18000.00, NULL, NULL, 1),
('CUENTA-003', 3, 7500.00, 3, 37500.00, 45000.00, NULL, NULL, 1),
('CUENTA-004', 1, 2000.00, 1, 10000.00, 12000.00, NULL, NULL, 0),
('CUENTA-005', 4, 4000.00, 4, 20000.00, 24000.00, NULL, NULL, 1);

-- Insertar detalles de cuentas
INSERT INTO detalle_cuentas (cuenta_id, producto_id, precio, cantidad, sub_total, comision) VALUES
-- Detalles para CUENTA-001
(1, 1, 5000.00, 2, 10000.00, 1000.00),
(1, 2, 7500.00, 2, 15000.00, 4000.00),

-- Detalles para CUENTA-002
(2, 3, 3000.00, 3, 9000.00, 1500.00),
(2, 4, 6000.00, 1, 6000.00, 1500.00),

-- Detalles para CUENTA-003
(3, 1, 5000.00, 3, 15000.00, 3000.00),
(3, 2, 7500.00, 3, 22500.00, 4500.00),

-- Detalles para CUENTA-004
(4, 5, 2000.00, 5, 10000.00, 2000.00),

-- Detalles para CUENTA-005
(5, 1, 5000.00, 2, 10000.00, 2000.00),
(5, 3, 3000.00, 2, 6000.00, 1200.00),
(5, 4, 6000.00, 1, 6000.00, 800.00);

-- Insertar usuarios asociados a cuentas
INSERT INTO cuentas_usuarios (cuenta_id, usuario_id) VALUES
(1, 1), -- Usuario 1 asociado a cuenta 1
(1, 2), -- Usuario 2 también asociado a cuenta 1
(2, 1), -- Usuario 1 asociado a cuenta 2
(3, 3), -- Usuario 3 asociado a cuenta 3
(4, 1), -- Usuario 1 asociado a cuenta 4
(5, 2), -- Usuario 2 asociado a cuenta 5
(5, 4); -- Usuario 4 también asociado a cuenta 5

-- Actualizar algunos registros para mostrar diferentes estados
UPDATE cuentas SET estado = 0 WHERE id_cuenta = 4; -- Cuenta cerrada
UPDATE cuentas SET estado = -1 WHERE id_cuenta = 5; -- Cuenta eliminada 