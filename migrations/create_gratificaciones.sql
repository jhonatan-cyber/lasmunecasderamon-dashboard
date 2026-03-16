-- Tabla de gratificaciones
CREATE TABLE IF NOT EXISTS gratificaciones (
  id VARCHAR(36) PRIMARY KEY,
  fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_id INT NOT NULL,
  monto DECIMAL(10, 2) NOT NULL,
  descripcion TEXT,
  estado INT NOT NULL DEFAULT 1,
  fecha_crea DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_mod DATETIME DEFAULT NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

-- Índices para mejorar el rendimiento
CREATE INDEX idx_gratificaciones_usuario ON gratificaciones(usuario_id);
CREATE INDEX idx_gratificaciones_fecha ON gratificaciones(fecha_hora);
