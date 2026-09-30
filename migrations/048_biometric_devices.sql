-- 048) Registro de asistencia con lector biométrico en la puerta
--
-- El equipo (ZKTeco o Dahua) empuja cada verificación a una URL pública del sitio:
--   ZKTeco -> GET/POST /iclock/cdata   (protocolo ADMS/iClock)
--   Dahua  -> POST /dahua/push         (JSON)
-- El sistema identifica al equipo por su serial, resuelve a la persona por
-- `usuarios.biometrico_codigo` y registra la asistencia con la misma ventana
-- horaria que el resto de las vias (asistencia_hora_inicio / asistencia_hora_fin).
--
-- El enrolamiento de huella y cara se hace en el menu del propio equipo: acá solo
-- queda el codigo que el equipo reporta y el estado de cada modalidad, que se
-- marca al editar la ficha del usuario (ambos opcionales).

CREATE TABLE IF NOT EXISTS biometric_devices (
  id varchar(36) PRIMARY KEY,
  nombre varchar(100) NOT NULL,
  marca varchar(20) NOT NULL,
  modelo varchar(80),
  serial varchar(64) NOT NULL UNIQUE,
  ip varchar(45),
  creado_por varchar(36),
  fecha_crea timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ultimo_uso timestamptz,
  revocado_en timestamptz
);

COMMENT ON TABLE biometric_devices IS
  'Equipos autorizados a empujar verificaciones biométricas; el serial es la credencial.';

-- Ficha del usuario: con quien coincide el codigo que reporta el equipo.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS biometrico_codigo varchar(20);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS biometrico_huella smallint NOT NULL DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS biometrico_facial smallint NOT NULL DEFAULT 0;

-- Dos personas no pueden compartir el mismo codigo en el equipo.
CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_biometrico_codigo
  ON usuarios (biometrico_codigo)
  WHERE biometrico_codigo IS NOT NULL AND biometrico_codigo <> '';

-- Todo lo que llega queda registrado: los codigos sin usuario (huérfanos) y los
-- duplicados/fuera de ventana tambien, para poder diagnosticar un equipo mal
-- configurado sin perder eventos.
CREATE TABLE IF NOT EXISTS biometric_events (
  id varchar(36) PRIMARY KEY,
  device_id varchar(36),
  serial varchar(64) NOT NULL,
  codigo_persona varchar(64) NOT NULL,
  fecha_dispositivo timestamptz,
  metodo varchar(20),
  usuario_id varchar(36),
  resultado varchar(30) NOT NULL,
  payload text,
  fecha_recepcion timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_biometric_events_recepcion
  ON biometric_events (fecha_recepcion DESC);
CREATE INDEX IF NOT EXISTS idx_biometric_events_serial
  ON biometric_events (serial, fecha_recepcion DESC);
