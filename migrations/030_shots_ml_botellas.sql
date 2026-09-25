-- Ventas por shot: botellas abiertas con ml restantes.
--
-- inventario_presentaciones.ml_botella: capacidad de la botella en ml. NULL = usar el
--   valor por defecto de Configuraciones (`botella_ml`, 750 si no está configurado).
-- inventario_unidades.ml_restante: ml que le quedan a una botella abierta. NULL = sin
--   abrir (llena). Una botella con ml_restante > 0 sigue activa en el bar y se muestra
--   con su contenido restante.
-- inventario_movimientos.ml: ml consumidos por una venta de shots (NULL = solo botellas).
ALTER TABLE inventario_presentaciones ADD COLUMN IF NOT EXISTS ml_botella integer DEFAULT NULL;
ALTER TABLE inventario_unidades ADD COLUMN IF NOT EXISTS ml_restante integer DEFAULT NULL;
ALTER TABLE inventario_movimientos ADD COLUMN IF NOT EXISTS ml integer DEFAULT NULL;
