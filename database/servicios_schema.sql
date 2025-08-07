-- Esquema para servicios privados
-- Tabla principal de servicios

CREATE TABLE IF NOT EXISTS servicios (
  id_servicio INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(8) NOT NULL UNIQUE,
  cliente_id INT NOT NULL,
  habitacion_id INT,
  precio_habitacion DECIMAL(10,2) DEFAULT 0,
  precio_servicio DECIMAL(10,2) NOT NULL,
  iva DECIMAL(10,2) DEFAULT 0,
  sub_total DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  tiempo INT NOT NULL, -- tiempo en minutos
  metodo_pago VARCHAR(50) DEFAULT NULL, -- método de pago
  fecha_crea TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  estado TINYINT DEFAULT 1, -- 1: activo, 0: finalizado
  FOREIGN KEY (cliente_id) REFERENCES clientes(id_cliente),
  FOREIGN KEY (habitacion_id) REFERENCES habitaciones(id_habitacion)
);

-- Tabla de detalles de servicios (anfitrionas asignadas)
CREATE TABLE IF NOT EXISTS detalle_servicios (
  id_detalle_servicio INT AUTO_INCREMENT PRIMARY KEY,
  servicio_id INT NOT NULL,
  usuario_id INT NOT NULL,
  fecha_crea TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (servicio_id) REFERENCES servicios(id_servicio) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id_usuario)
);

-- Índices para mejorar el rendimiento
CREATE INDEX idx_servicios_codigo ON servicios(codigo);
CREATE INDEX idx_servicios_cliente ON servicios(cliente_id);
CREATE INDEX idx_servicios_habitacion ON servicios(habitacion_id);
CREATE INDEX idx_servicios_estado ON servicios(estado);
CREATE INDEX idx_servicios_fecha ON servicios(fecha_crea);
CREATE INDEX idx_detalle_servicios_servicio ON detalle_servicios(servicio_id);
CREATE INDEX idx_detalle_servicios_usuario ON detalle_servicios(usuario_id);

-- Datos de prueba (opcional)
INSERT INTO servicios (codigo, cliente_id, habitacion_id, precio_habitacion, precio_servicio, iva, sub_total, total, tiempo, estado) VALUES
('ABC12345', 1, 1, 50000, 100000, 0, 100000, 150000, 120, 1),
('DEF67890', 2, 2, 60000, 120000, 19000, 120000, 199000, 90, 1),
('GHI11111', 3, 3, 45000, 80000, 0, 80000, 125000, 60, 0);

-- Detalles de servicios de prueba
INSERT INTO detalle_servicios (servicio_id, usuario_id) VALUES
(1, 1),
(1, 2),
(2, 1),
(3, 3); 