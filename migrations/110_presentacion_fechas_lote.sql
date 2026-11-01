-- 110) Fechas de lote por presentación ---------------------------------------
-- Antes las tres fechas del lote vivían en `productos`. Un producto puede tener
-- varias presentaciones y cada una llega con su propio lote, así que pasan a
-- `inventario_presentaciones`. Se mantienen las columnas de `productos` para no
-- romper lecturas existentes: `productos.fecha_vencimiento` sigue alimentando
-- el badge y la alerta, derivado del vencimiento más temprano de sus
-- presentaciones.
ALTER TABLE inventario_presentaciones
  ADD COLUMN IF NOT EXISTS fecha_elaboracion date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS duracion_meses integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fecha_vencimiento date DEFAULT NULL;

-- Backfill: cada presentación hereda las fechas que hoy declara su producto.
-- Sólo completa lo que está en NULL, así que es idempotente.
UPDATE inventario_presentaciones p
   SET fecha_elaboracion = COALESCE(p.fecha_elaboracion, pr.fecha_elaboracion),
       duracion_meses = COALESCE(p.duracion_meses, pr.duracion_meses),
       fecha_vencimiento = COALESCE(p.fecha_vencimiento, pr.fecha_vencimiento)
  FROM productos pr
 WHERE pr.id_producto = p.producto_id
   AND (pr.fecha_elaboracion IS NOT NULL
        OR pr.duracion_meses IS NOT NULL
        OR pr.fecha_vencimiento IS NOT NULL)
   AND (p.fecha_elaboracion IS NULL
        OR p.duracion_meses IS NULL
        OR p.fecha_vencimiento IS NULL);
