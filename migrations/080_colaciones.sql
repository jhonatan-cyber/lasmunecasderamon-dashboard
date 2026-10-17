CREATE TABLE colaciones (
  id varchar(36) PRIMARY KEY,
  usuario_id varchar(36) NOT NULL REFERENCES usuarios(id_usuario),
  producto text NOT NULL CHECK (producto IN ('copa', 'corto')),
  cantidad integer NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  precio integer NOT NULL CHECK (precio > 0),
  metodo_pago varchar(20) NOT NULL CHECK (metodo_pago IN ('efectivo', 'tarjeta', 'transferencia')),
  caja_id varchar(36) NOT NULL REFERENCES cajas(id_caja),
  registrado_por varchar(36) NOT NULL REFERENCES usuarios(id_usuario),
  fecha date NOT NULL,
  fecha_crea timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (usuario_id, fecha)
);

CREATE INDEX idx_colaciones_fecha ON colaciones(fecha DESC);
