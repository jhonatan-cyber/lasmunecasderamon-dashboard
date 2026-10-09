-- Limita el pago de compras a efectivo, tarjeta o transferencia.
-- Normaliza valores históricos fuera de las opciones permitidas.
UPDATE compras
SET metodo_pago = 'efectivo'
WHERE metodo_pago NOT IN ('efectivo', 'tarjeta', 'transferencia');

ALTER TABLE compras
  DROP CONSTRAINT IF EXISTS compras_metodo_pago_check;

ALTER TABLE compras
  ADD CONSTRAINT compras_metodo_pago_check
  CHECK (metodo_pago IN ('efectivo', 'tarjeta', 'transferencia'));
