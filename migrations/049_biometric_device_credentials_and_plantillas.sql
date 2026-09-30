-- 049) Enrolamiento gestionado: credenciales del equipo y plantillas maestras en la DB
--
-- Fase 1 del flujo biométrico pedido: al crear/editar una persona se enrolan su
-- cara y/o huella DESDE el sistema, conectándose al lector por IP. La plantilla
-- biométrica vive en nuestra base (maestro) y se sincroniza una copia al equipo,
-- que es quien coteja en la puerta (sigue verificando aunque se corte la red).
--
-- La autenticación contra el equipo es HTTP Digest (CGI de Dahua): el lector
-- necesita usuario y clave. La clave se guarda cifrada con AES-256-GCM usando la
-- variable de entorno `BIOMETRIC_ENCRYPTION_KEY` (32 bytes en base64). Sin esa
-- variable el campo queda inutilizable: mejor sin conexión que en texto plano.
--
-- Serial de 048: sigue siendo la identidad del equipo (el push de eventos a
-- /dahua/push sigue autenticando por serial). La IP y las credenciales son lo
-- nuevo: son lo que el SERVIDOR usa para CONECTARSE AL equipo.

ALTER TABLE biometric_devices
  ADD COLUMN IF NOT EXISTS ip varchar(45),
  ADD COLUMN IF NOT EXISTS usuario_equipo varchar(64),
  ADD COLUMN IF NOT EXISTS clave_cifrada text;

-- ¿Por qué no revocable con NOT NULL? Equipos ya vinculados (048) no tienen
-- credenciales: siguen recibiendo push, solo no se les puede enrolar desde acá
-- hasta que el administrador cargue IP/usuario/clave en Configuraciones.

COMMENT ON COLUMN biometric_devices.usuario_equipo IS
  'Usuario CGI del equipo (Dahua: admin). Lo pide el administrador al vincular.';
COMMENT ON COLUMN biometric_devices.clave_cifrada IS
  'Clave CGI del equipo, AES-256-GCM con BIOMETRIC_ENCRYPTION_KEY (base64: iv.tag.datos).';

-- La plantilla maestra: lo que el sistema guarda y desde acá se distribuye.
-- `datos` es EXACTAMENTE lo que el equipo produce/consume (base64 de plantilla
-- o foto JPEG): el sistema nunca re-codifica, solo almacena y reparte.
CREATE TABLE IF NOT EXISTS biometric_plantillas (
  id varchar(36) PRIMARY KEY,
  usuario_id varchar(36) NOT NULL,
  dispositivo_id varchar(36) NOT NULL,
  tipo varchar(10) NOT NULL CHECK (tipo IN ('huella', 'cara')),
  datos text NOT NULL,
  fecha_captura timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_sincronizacion timestamptz,
  sincronizada smallint NOT NULL DEFAULT 0,
  UNIQUE (usuario_id, dispositivo_id, tipo)
);

CREATE INDEX IF NOT EXISTS idx_biometric_plantillas_usuario
  ON biometric_plantillas (usuario_id);

COMMENT ON TABLE biometric_plantillas IS
  'Plantillas biométricas maestras (sistema), por equipo. sincronizada=0 marca lo que falta empujar al lector.';

-- El código que reporta el equipo por la persona (ya existía en usuarios desde
-- 048, lo deja la migración anterior; no se toca acá).
