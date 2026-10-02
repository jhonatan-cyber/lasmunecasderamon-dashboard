-- 056) Corte de histórico biométrico
--
-- Después de un reset biométrico, `biometric_device_records` queda vacía y
-- MAX(rec_no) vuelve a 0: el poller re-importaría TODO el historial que el
-- lector aún conserva (audios y asistencias fantasma). La marca
-- `historico_limpiado_en` le dice desde cuándo importa: ignora los registros
-- del lector con CreateTime anterior al corte.
--
-- La pone `scripts/reset-biometrico.cjs` (siempre después de vaciar el lector).
-- timestamptz es adrede: el poller compara con CreateTime (época UTC del
-- lector) y un `timestamp` naive se interpretaría con el tz de la máquina
-- (UTC-4) en vez del real (Santiago), corriendo el corte horas al futuro.
ALTER TABLE biometric_devices
  ADD COLUMN IF NOT EXISTS historico_limpiado_en timestamptz;

COMMENT ON COLUMN biometric_devices.historico_limpiado_en IS
  'Instante del último reset biométrico; el poller ignora registros del lector anteriores a esta marca.';
