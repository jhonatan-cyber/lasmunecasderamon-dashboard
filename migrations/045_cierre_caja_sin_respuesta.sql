-- 045) Cierre de caja sin respuesta: recordatorios y segundo pedido
--
-- Un cierre pedido puede quedarse en el olvido: el administrador no vio el WhatsApp, el
-- mensaje se perdió, o pasó el rato sin que nadie contestara. Con la 044 el cajero ya podía
-- reenviar el aviso a mano, pero seguía dependiendo de que alguien se acordara de insistir:
-- si el cajero se va, la solicitud queda pendiente para siempre y el índice único parcial
-- impide pedir el cierre del turno otra vez.
--
-- Este cambio cierra las dos puntas:
--   1. El cron (`cron/check-timers`) vuelve a avisar solo, cada `AVISO_CIERRE_REINTENTO_MS`,
--      mientras la solicitud siga dentro de `AVISO_CIERRE_VENTANA_MS` desde que se pidió.
--   2. Pasada esa ventana sin respuesta, el cajero puede **pedir el cierre de nuevo**: la
--      solicitud vieja se cierra como 'expirada' (eso libera el índice único parcial) y se
--      crea una nueva con otro token, para que el aviso vuelva a salir desde cero.
--
-- 'expirada' es distinto de 'rechazada' a propósito: rechazada es una decisión del
-- administrador, expirada es el silencio. Mezclarlas borraría del historial quién dijo que
-- no y quién no dijo nada.

ALTER TABLE solicitudes_cierre_caja
  DROP CONSTRAINT IF EXISTS chk_solicitudes_cierre_caja_estado;
ALTER TABLE solicitudes_cierre_caja
  ADD CONSTRAINT chk_solicitudes_cierre_caja_estado
  CHECK (estado IN ('pendiente', 'aprobada', 'rechazada', 'expirada'));

-- El cron busca pendientes por vencimiento del último aviso; este índice evita recorrer
-- toda la tabla en cada corrida.
CREATE INDEX IF NOT EXISTS idx_solicitudes_cierre_caja_aviso
  ON solicitudes_cierre_caja (estado, ultimo_aviso_en);
