-- 054) Identificación facial 1:N en el servidor
--
-- Fase B del "que el lector solo mande la imagen": con la foto de cada record
-- el servidor decide QUIÉN es, sin confiar en el UserID que manda el equipo.
-- El motor es el propio lector vía NetSDK (`CLIENT_FaceInfoOpreate` →
-- GETFACEEIGEN, ya usado en vivo por enrolar/verificar): extrae un eigen de
-- 256 floats de una foto y el servidor compara por similitud coseno.
--
-- Para no pegarle al equipo por cada usuario en cada marcación, el eigen de la
-- foto de referencia queda cacheado por plantilla:
--
--   biometric_plantillas.vector               256 float32 little-endian (1024 B)
--   biometric_plantillas.vector_actualizado_en  cuándo se extrajo; si es
--                                             anterior a fecha_captura la foto
--                                             cambió y hay que reextraer
--
-- Y el resultado por record:
--
--   biometric_device_records.identificado_usuario_id  a quién vio el servidor
--   biometric_device_records.identificacion_similitud 0..1 del mejor candidato
--   biometric_device_records.identificacion_estado    identificado | conflicto |
--                                                     sin_coincidencia | sin_cara |
--                                                     sin_plantillas | error |
--                                                     sin_foto
--
-- `conflicto` es el caso interesante: el equipo reclamó un código y la cara de
-- la foto corresponde a OTRA persona (o al revés: equipo sin código y el
-- servidor sí identifica). No modifica asistencias: la decisión de puerta es
-- la Fase C.

ALTER TABLE biometric_plantillas ADD COLUMN IF NOT EXISTS vector bytea;
ALTER TABLE biometric_plantillas ADD COLUMN IF NOT EXISTS vector_actualizado_en timestamptz;
ALTER TABLE biometric_device_records ADD COLUMN IF NOT EXISTS identificado_usuario_id varchar(36);
ALTER TABLE biometric_device_records ADD COLUMN IF NOT EXISTS identificacion_similitud real;
ALTER TABLE biometric_device_records ADD COLUMN IF NOT EXISTS identificacion_estado varchar(20);

COMMENT ON COLUMN biometric_plantillas.vector IS
  'Eigen facial (256 float32 LE) extraido con CLIENT_FaceInfoOpreate; NULL = pendiente.';
COMMENT ON COLUMN biometric_plantillas.vector_actualizado_en IS
  'Momento de la extraccion; anterior a fecha_captura = foto cambiada, reextraer.';
COMMENT ON COLUMN biometric_device_records.identificado_usuario_id IS
  'Usuario que el servidor identifico en la foto del record (1:N).';
COMMENT ON COLUMN biometric_device_records.identificacion_similitud IS
  'Similitud coseno 0..1 del mejor candidato contra la foto del record.';
COMMENT ON COLUMN biometric_device_records.identificacion_estado IS
  'Resultado del 1:N: identificado, conflicto, sin_coincidencia, sin_cara, sin_plantillas, error, sin_foto.';

CREATE INDEX IF NOT EXISTS idx_biometric_plantillas_vector_pendiente
  ON biometric_plantillas (usuario_id)
  WHERE tipo = 'cara' AND vector IS NULL;

CREATE INDEX IF NOT EXISTS idx_biometric_records_identificacion_pendiente
  ON biometric_device_records (fecha_dispositivo DESC)
  WHERE foto IS NOT NULL AND identificacion_estado IS NULL;
