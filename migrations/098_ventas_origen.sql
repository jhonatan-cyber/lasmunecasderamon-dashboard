-- 098) Origen de la venta: de dónde nació el cobro ------------------------------
-- Hasta ahora el origen se deducía en cada consulta a partir de los vínculos
-- (`entrada_id`, `servicio_id`, `habitacion_id`, `pedido_id`) y sólo los cortos
-- del bar lo calculaban. Persistirlo hace que el dato sea uno solo y consultable:
-- el reporte no tiene que repetir la prioridad ni adivinarla.
--
-- Prioridad, idéntica a `resolverOrigenVenta` (lib/business/ventasOrigen.ts) y a
-- `OrigenCorto`, sin `cuenta`: el módulo de cuentas pospago se reemplazó por
-- prepago y ya no genera ventas.
--   entrada > servicio > habitacion > pedido > barra
--
-- El default 'barra' no es una adivinanza: una venta sin ningún vínculo es
-- exactamente una venta de barra, y es lo mismo que devuelve el resolvedor
-- cuando no hay señales.
ALTER TABLE ventas
  ADD COLUMN IF NOT EXISTS origen varchar(20) NOT NULL DEFAULT 'barra';

UPDATE ventas
   SET origen = CASE
     WHEN entrada_id IS NOT NULL THEN 'entrada'
     WHEN servicio_id IS NOT NULL THEN 'servicio'
     WHEN habitacion_id IS NOT NULL THEN 'habitacion'
     WHEN pedido_id IS NOT NULL THEN 'pedido'
     ELSE 'barra'
   END
 WHERE origen = 'barra';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ventas_origen_check'
  ) THEN
    ALTER TABLE ventas
      ADD CONSTRAINT ventas_origen_check
      CHECK (origen IN ('entrada', 'servicio', 'habitacion', 'pedido', 'barra'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_ventas_origen_fecha
  ON ventas (origen, fecha_crea);
