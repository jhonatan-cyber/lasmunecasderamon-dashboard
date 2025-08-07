-- Tabla para registrar propinas de ventas
CREATE TABLE IF NOT EXISTS propinas (
    id_propina INT AUTO_INCREMENT PRIMARY KEY,
    venta_id INT NOT NULL,
    propina DECIMAL(10,2) NOT NULL,
    fecha_crea TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado TINYINT DEFAULT 1,
    FOREIGN KEY (venta_id) REFERENCES ventas(id_venta) ON DELETE CASCADE
);

-- Tabla para el detalle de distribución de propinas
CREATE TABLE IF NOT EXISTS detalle_propinas (
    id_detalle_propina INT AUTO_INCREMENT PRIMARY KEY,
    propina_id INT NOT NULL,
    usuario_id INT NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    fecha_crea TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado TINYINT DEFAULT 1,
    FOREIGN KEY (propina_id) REFERENCES propinas(id_propina) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

-- Índices para mejorar el rendimiento
CREATE INDEX idx_propinas_venta_id ON propinas(venta_id);
CREATE INDEX idx_detalle_propinas_propina_id ON detalle_propinas(propina_id);
CREATE INDEX idx_detalle_propinas_usuario_id ON detalle_propinas(usuario_id);

-- Datos de prueba para propinas
INSERT INTO propinas (venta_id, propina, fecha_crea, estado) VALUES
(1, 5000, '2025-07-15 02:50:18', 1),
(2, 600, '2025-07-15 01:45:30', 1),
(3, 500, '2025-06-23 14:49:20', 1),
(4, 1200, '2025-06-20 22:15:45', 0),
(5, 800, '2025-06-18 19:30:12', 0);

-- Datos de prueba para detalle_propinas
INSERT INTO detalle_propinas (propina_id, usuario_id, monto, fecha_crea, estado) VALUES
(1, 1, 5000, '2025-07-15 02:50:18', 1),
(2, 1, 600, '2025-07-15 01:45:30', 1),
(3, 1, 500, '2025-06-23 14:49:20', 1),
(4, 1, 1200, '2025-06-20 22:15:45', 0),
(5, 1, 800, '2025-06-18 19:30:12', 0);