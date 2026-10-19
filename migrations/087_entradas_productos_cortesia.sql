CREATE TABLE IF NOT EXISTS entradas_clientes_productos (
  entrada_id varchar(36) NOT NULL REFERENCES entradas_clientes(id) ON DELETE CASCADE,
  presentacion_id varchar(36) NOT NULL REFERENCES inventario_presentaciones(id),
  cantidad integer NOT NULL CHECK (cantidad BETWEEN 1 AND 1000),
  acompanamiento_presentacion_id varchar(36) REFERENCES inventario_presentaciones(id),
  PRIMARY KEY (entrada_id, presentacion_id)
);
