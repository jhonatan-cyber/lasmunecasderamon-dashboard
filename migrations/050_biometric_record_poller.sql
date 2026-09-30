-- 050) Recolección de registros del equipo para la asistencia (fase 2)
--
-- El lector coteja en la puerta con la copia de las plantillas (fase 1) y
-- acumula cada verificación en su memoria. El poller del servidor las baja
-- cada minuto con recordFinder.cgi (AccessControlCardRec) y las convierte en
-- asistencias con las mismas reglas que las demás vías.
--
-- `biometric_device_records` es la MARCA de agua: qué records del equipo ya
-- se procesaron. Evita dobles asistencias si el ciclo corre en paralelo o si
-- el equipo re-enumera sus records tras un reinicio. No es la auditoría de
-- eventos (esa sigue siendo `biometric_events`): solo dedupe técnico.

CREATE TABLE IF NOT EXISTS biometric_device_records (
  id varchar(36) PRIMARY KEY,
  dispositivo_id varchar(36) NOT NULL,
  serial varchar(64) NOT NULL,
  rec_no bigint NOT NULL,
  codigo_persona varchar(64) NOT NULL,
  fecha_dispositivo timestamptz NOT NULL,
  metodo varchar(20) NOT NULL,
  status integer,
  UNIQUE (serial, rec_no)
);

CREATE INDEX IF NOT EXISTS idx_biometric_device_records_contenido
  ON biometric_device_records (serial, codigo_persona, fecha_dispositivo, metodo);

-- Interruptor del recolector, por equipo. Los equipos viejos quedan apagados:
-- se enciende desde Configuraciones → Asistencia cuando el administrador
-- cargó credenciales y probó la conexión.
ALTER TABLE biometric_devices
  ADD COLUMN IF NOT EXISTS recoger_registros smallint NOT NULL DEFAULT 0;

COMMENT ON TABLE biometric_device_records IS
  'Watermark de records AccessControlCardRec ya convertidos en asistencia (dedupe, no auditoría).';
