ALTER TABLE colaciones
  ADD COLUMN IF NOT EXISTS ml_bebida integer NOT NULL DEFAULT 0;

ALTER TABLE colaciones
  DROP CONSTRAINT IF EXISTS colaciones_ml_bebida_check,
  ADD CONSTRAINT colaciones_ml_bebida_check CHECK (ml_bebida BETWEEN 0 AND 10000);

CREATE TABLE IF NOT EXISTS entradas_clientes (
  id varchar(36) PRIMARY KEY,
  cliente_nombre varchar(160),
  monto_entrada integer NOT NULL CHECK (monto_entrada >= 0),
  monto_bebida_adicional integer NOT NULL DEFAULT 0 CHECK (monto_bebida_adicional >= 0),
  cover_presentacion_id varchar(36) REFERENCES inventario_presentaciones(id),
  fecha date NOT NULL,
  hora time NOT NULL,
  caja_id varchar(36) NOT NULL REFERENCES cajas(id_caja),
  registrado_por varchar(36) NOT NULL REFERENCES usuarios(id_usuario),
  fecha_crea timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (monto_entrada + monto_bebida_adicional <= 2147483647)
);

CREATE INDEX IF NOT EXISTS idx_entradas_clientes_fecha ON entradas_clientes(fecha DESC, hora DESC);
CREATE INDEX IF NOT EXISTS idx_entradas_clientes_caja ON entradas_clientes(caja_id, fecha DESC);
