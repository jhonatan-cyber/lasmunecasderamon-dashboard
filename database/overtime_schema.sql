-- Esquema de base de datos para el módulo de horas extras

-- Tabla de horas extras
CREATE TABLE IF NOT EXISTS horas_extras (
  id_hora_extra INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  hora DECIMAL(5,2) NOT NULL,
  monto DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  fecha_crea TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_mod TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  estado TINYINT DEFAULT 1,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

-- Índices para mejorar el rendimiento
CREATE INDEX idx_horas_extras_usuario_id ON horas_extras(usuario_id);
CREATE INDEX idx_horas_extras_fecha_crea ON horas_extras(fecha_crea);
CREATE INDEX idx_horas_extras_estado ON horas_extras(estado);

-- Datos de prueba para horas extras
INSERT INTO horas_extras (usuario_id, hora, monto, total, fecha_crea, estado) VALUES
(2, 2.5, 15.00, 37.50, '2025-07-15 14:30:00', 1),
(2, 2.0, 15.00, 30.00, '2025-07-14 16:45:00', 1),
(3, 2.0, 12.50, 25.00, '2025-07-15 15:20:00', 1),
(3, 2.0, 12.50, 25.00, '2025-07-14 17:30:00', 1),
(4, 3.0, 18.00, 54.00, '2025-07-15 13:15:00', 1),
(4, 2.0, 18.00, 36.00, '2025-07-14 18:45:00', 1),
(5, 3.0, 14.00, 42.00, '2025-07-15 12:30:00', 1),
(5, 3.0, 14.00, 42.00, '2025-07-14 19:20:00', 1);