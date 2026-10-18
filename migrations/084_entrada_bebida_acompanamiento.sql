ALTER TABLE entradas_clientes
  ADD COLUMN IF NOT EXISTS bebida_acompanamiento_presentacion_id varchar(36)
  REFERENCES inventario_presentaciones(id);
