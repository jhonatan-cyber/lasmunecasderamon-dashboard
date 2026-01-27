-- Tabla para asociar servicios con clientes
CREATE TABLE IF NOT EXISTS detalle_servicios_clientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  servicio_id INT NOT NULL,
  cliente_id INT NOT NULL,
  FOREIGN KEY (servicio_id) REFERENCES servicios(id),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);
