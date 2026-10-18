ALTER TABLE ventas
  ADD COLUMN IF NOT EXISTS entrada_id varchar(36)
  REFERENCES entradas_clientes(id);

CREATE INDEX IF NOT EXISTS idx_ventas_entrada_id ON ventas(entrada_id);
