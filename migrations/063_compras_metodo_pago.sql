-- Registra el método de pago informado para cada compra de inventario.
-- Las compras existentes quedan con efectivo como valor histórico predeterminado.
ALTER TABLE compras
  ADD COLUMN IF NOT EXISTS metodo_pago varchar(30) NOT NULL DEFAULT 'efectivo';

ALTER TABLE compras
  DROP CONSTRAINT IF EXISTS compras_metodo_pago_check;

ALTER TABLE compras
  ADD CONSTRAINT compras_metodo_pago_check
  CHECK (metodo_pago IN ('efectivo', 'tarjeta', 'transferencia', 'otro'));
