-- Registra el saldo prepago que no pudo cubrirse con el efectivo disponible al cierre.
-- Se muestra como pendiente de devolución y no vuelve negativo el monto de cierre.
ALTER TABLE cajas
  ADD COLUMN IF NOT EXISTS saldo_clientes_por_devolver integer NOT NULL DEFAULT 0;

ALTER TABLE solicitudes_cierre_caja
  ADD COLUMN IF NOT EXISTS saldo_clientes_por_devolver integer NOT NULL DEFAULT 0;
