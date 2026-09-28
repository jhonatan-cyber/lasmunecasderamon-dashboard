-- Ml por shot para anfitrionas, configurable por producto.
--
-- productos.ml_shot_anfitriona: ml que se sirve en cada shot cuando lo pide una
--   anfitriona. NULL (o 0) = igual que el shot de cliente (productos.ml_shot, y en
--   su defecto el `shot_ml` global de Configuraciones). El precio del shot es único
--   para ambas audiencias (opciones_venta.precio y precio_anfitriona con el mismo
--   valor): lo que cambia por audiencia es el volumen servido, no el precio.
ALTER TABLE productos ADD COLUMN IF NOT EXISTS ml_shot_anfitriona integer DEFAULT NULL;
