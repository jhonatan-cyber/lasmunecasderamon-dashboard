-- Tabla para manejar asignaciones específicas de anfitrionas a productos (especialmente champañas)
CREATE TABLE IF NOT EXISTS detalle_pedidos_anfitrionas (
  id_detalle_anfitriona INT AUTO_INCREMENT PRIMARY KEY,
  detalle_pedido_id INT NOT NULL,
  anfitriona_id INT NOT NULL,
  fecha_crea TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (detalle_pedido_id) REFERENCES detalle_pedidos(id_detalle_pedido) ON DELETE CASCADE,
  FOREIGN KEY (anfitriona_id) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  UNIQUE KEY unique_detalle_anfitriona (detalle_pedido_id, anfitriona_id)
);

-- Índices para mejorar el rendimiento
CREATE INDEX idx_detalle_pedidos_anfitrionas_detalle ON detalle_pedidos_anfitrionas(detalle_pedido_id);
CREATE INDEX idx_detalle_pedidos_anfitrionas_anfitriona ON detalle_pedidos_anfitrionas(anfitriona_id);