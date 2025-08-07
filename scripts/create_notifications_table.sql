-- Crear tabla de notificaciones del sistema
CREATE TABLE IF NOT EXISTS notificaciones_sistema (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo VARCHAR(100) NOT NULL,
  datos JSON NOT NULL,
  leida TINYINT(1) DEFAULT 0,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_lectura TIMESTAMP NULL,
  INDEX idx_tipo (tipo),
  INDEX idx_leida (leida),
  INDEX idx_fecha_creacion (fecha_creacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Comentarios sobre la tabla
-- tipo: Tipo de notificación (anulacion_confirmada, anulacion_rechazada, anulacion_servicio_confirmada, anulacion_servicio_rechazada)
-- datos: JSON con los datos de la notificación
-- leida: 0 = no leída, 1 = leída
-- fecha_creacion: Cuando se creó la notificación
-- fecha_lectura: Cuando se leyó la notificación (NULL si no se ha leído) 