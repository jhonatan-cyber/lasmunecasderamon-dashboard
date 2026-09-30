-- 044) Último aviso del cierre de caja pendiente
--
-- Un cierre pedido puede quedarse esperando: el administrador no vio el WhatsApp, el
-- mensaje se perdió entre otros, o simplemente pasó el rato. Hasta ahora la única salida
-- era que un administrador cerrara desde el dashboard, porque el índice único parcial
-- impide crear una segunda solicitud pendiente del mismo turno.
--
-- `ultimo_aviso_en` es cuándo salió el último aviso al administrador: se setea al crear
-- la solicitud (el primer aviso sale enseguida) y se actualiza cada vez que se reenvía.
-- Sirve para dos cosas:
--   1. mostrar en la UI desde cuándo nadie responde, y
--   2. enfriar el reenvío para que un cajero insistente no convierta el WhatsApp del
--      administrador en spam (Twilio termina limitando el número).
--
-- Las solicitudes históricas quedan con la fecha en que se pidió el cierre: es el mejor
-- dato disponible de cuándo salió su único aviso.

ALTER TABLE solicitudes_cierre_caja ADD COLUMN IF NOT EXISTS ultimo_aviso_en timestamp;

UPDATE solicitudes_cierre_caja
   SET ultimo_aviso_en = fecha_solicitud
 WHERE ultimo_aviso_en IS NULL;
