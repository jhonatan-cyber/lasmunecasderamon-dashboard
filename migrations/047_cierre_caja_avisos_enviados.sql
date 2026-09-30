-- 047) Cuántas veces se avisó del cierre de caja pendiente
--
-- La página del link (`/confirmar-cierre-caja?token=`) es lo que el administrador mira
-- antes de decidir, y hasta ahora solo sabía cuándo se pidió el cierre: no cuántas veces
-- se le avisó ni desde cuánto nadie contesta. `avisos_enviados` cuenta los WhatsApp que
-- salieron por esta solicitud —el original, que manda `solicitarCierre` justo después de
-- crearla, y uno más en cada reenvío manual y en cada recordatorio del cron, que pasan
-- todos por `registrarAvisoCierre`—.
--
-- El contador se incrementa en el mismo UPDATE que `ultimo_aviso_en` y **después** de
-- enviar: si Twilio falla, tampoco se infla el contador (igual que no se consume el
-- enfriamiento del reenvío).
--
-- Las solicitudes existentes quedan en 1: su aviso inicial es lo único reconstruible, los
-- reenvíos viejos no quedaron registrados.

ALTER TABLE solicitudes_cierre_caja
  ADD COLUMN IF NOT EXISTS avisos_enviados integer NOT NULL DEFAULT 1;
