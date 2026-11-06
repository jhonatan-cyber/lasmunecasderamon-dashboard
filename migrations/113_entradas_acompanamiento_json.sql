-- 113) Varias bebidas de acompañamiento por entrega -------------------------
-- Hasta ahora la entrega de una bebida desde la entrada guardaba una sola
-- presentación de acompañamiento (`bebida_acompanamiento_presentacion_id` y
-- `entradas_clientes_productos.acompanamiento_presentacion_id`). Desde aquí se
-- guarda el reparto completo por sabor —sabor + unidades, igual que en ventas—
-- en una columna JSON. Las columnas heredadas de un solo id se conservan para
-- los registros anteriores y como referencia de la primera bebida.
ALTER TABLE entradas_clientes
  ADD COLUMN IF NOT EXISTS acompanamientos jsonb;

ALTER TABLE entradas_clientes_productos
  ADD COLUMN IF NOT EXISTS acompanamientos jsonb;
