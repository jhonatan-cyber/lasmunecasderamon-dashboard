-- 053) Foto de la verificación junto a cada record y a cada asistencia
--
-- El equipo guarda, junto a cada AccessControlCardRec, la captura de la cara
-- que verificó: `records[i].URL=/SnapShotFilePath/AAAA-MM-DD/HH/MM/<user>_<...>.jpg`
-- (solo trae URL cuando hubo cara: los records de clave/tarjeta vienen sin foto).
--
-- El httpd del ASI3213A-W NO sirve esos archivos por HTTP/HTTPS (404) y el RPC2
-- no expone lectura (`FileManager.read` no existe), así que el servidor los
-- baja por NetSDK con `CLIENT_DownloadRemoteFile` (JPEG 640x384, ~24 KB,
-- verificado en vivo) y los guarda en la base:
--
--   biometric_device_records.foto_url  ruta en el equipo (permite reintentar)
--   biometric_device_records.foto      JPEG de la captura
--   asistencias.biometric_record_id    enlace asistencia -> record (la foto de la
--                                      marcación); NULL en vías manuales/QR
--
-- Solo la vía biométrica llena el enlace: el registro manual o por QR no tiene
-- record ni foto, y por eso la columna es anulable.

ALTER TABLE biometric_device_records ADD COLUMN IF NOT EXISTS foto_url varchar(255);
ALTER TABLE biometric_device_records ADD COLUMN IF NOT EXISTS foto bytea;
ALTER TABLE asistencias ADD COLUMN IF NOT EXISTS biometric_record_id varchar(36);

COMMENT ON COLUMN biometric_device_records.foto_url IS
  'Ruta SnapShotFilePath en el equipo; la baja el servidor por NetSDK.';
COMMENT ON COLUMN biometric_device_records.foto IS
  'JPEG de la captura de la verificación (CLIENT_DownloadRemoteFile).';
COMMENT ON COLUMN asistencias.biometric_record_id IS
  'Record del lector que originó la asistencia (NULL en vías manuales).';
