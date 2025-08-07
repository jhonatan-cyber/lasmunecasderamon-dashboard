-- Crear tabla de notificaciones del sistema
CREATE TABLE IF NOT EXISTS notificaciones_sistema (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipo VARCHAR(100) NOT NULL,
    datos JSON,
    leida TINYINT(1) DEFAULT 0,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_lectura TIMESTAMP NULL,
    INDEX idx_tipo (tipo),
    INDEX idx_leida (leida),
    INDEX idx_fecha_creacion (fecha_creacion)
);

-- Insertar algunas notificaciones de ejemplo (opcional)
-- INSERT INTO notificaciones_sistema (tipo, datos) VALUES 
-- ('sistema', '{"mensaje": "Bienvenido al sistema", "icono": "info"}'); 