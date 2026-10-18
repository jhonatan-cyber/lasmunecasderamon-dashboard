ALTER TABLE entradas_clientes
  ADD COLUMN IF NOT EXISTS metodo_pago varchar(20) NOT NULL DEFAULT 'efectivo';
