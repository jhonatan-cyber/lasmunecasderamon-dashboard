-- Volumen por shot configurable por producto.
--
-- productos.ml_shot: ml que se sirve en cada shot de este producto. NULL = usar
--   `shot_ml` de Configuraciones (50 si no está configurado). Va por producto porque
--   dos productos pueden compartir nombre de presentación (ej. "750 ml") con precios
--   y recetas distintas.
ALTER TABLE productos ADD COLUMN IF NOT EXISTS ml_shot integer DEFAULT NULL;
