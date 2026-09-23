-- 024) desafios de asistencia: la presencia se prueba en el servidor --------------
-- Hasta ahora, la asistencia se registraba por posesion de una credencial que el
-- propio sistema publicaba: `usuarios.qr_token` viajaba en la respuesta de
-- /api/public/users (endpoint sin autenticar) y era exactamente lo que aceptaba
-- POST /api/attendance/register. Cualquiera desde internet podia leer el padron
-- completo con sus tokens, y cualquier empleado con sesion podia marcar presente
-- a cualquier otro (o a si mismo, a distancia) escaneando un token ajeno.
--
-- Este archivo reemplaza esa credencial por un desafio que el servidor emite, guarda
-- y verifica:
--
--   * se emite solo desde superficies del local (la pantalla del kiosko, provisionada
--     con `KIOSK_DEVICE_SECRET`, o la pantalla de asistencia de un usuario con permiso),
--     nunca desde un endpoint publico;
--   * vive 120 segundos y se canjea una sola vez;
--   * se guarda hasheado (sha256): el token crudo solo existe en el QR que se muestra;
--   * solo lo puede canjear su dueño, o quien lo emitio desde la pantalla de personal.
--
-- Ademas el token personal deja de existir: se vacia la columna y se documenta su
-- retiro. La columna no se borra en esta migracion para no romper a un cliente
-- antiguo de golpe; el DDL del modelo viejo ya no autoriza nada.
--
-- Idempotente y sin efecto en las bases que ya tengan la tabla.

CREATE TABLE IF NOT EXISTS asistencia_desafios (
  id_desafio        varchar(36)   PRIMARY KEY,
  usuario_id        varchar(36)   NOT NULL,
  token_hash        varchar(64)   NOT NULL,
  emitido_por       varchar(80)   NOT NULL,
  emisor_usuario_id varchar(36)   DEFAULT NULL,
  expira_en         timestamptz   NOT NULL,
  usado_en          timestamptz   DEFAULT NULL,
  fecha_crea        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE asistencia_desafios IS
  'Desafios de un solo uso para registrar asistencia. El token crudo nunca se guarda: se guarda su sha256 en token_hash.';
COMMENT ON COLUMN asistencia_desafios.usuario_id IS
  'Usuario al que acredita el desafio (a quien le registra la asistencia el canje).';
COMMENT ON COLUMN asistencia_desafios.emitido_por IS
  'Superficie que lo emitio: kiosko o usuario:<id>. Solo el kiosko emite desafios de autoservicio.';
COMMENT ON COLUMN asistencia_desafios.emisor_usuario_id IS
  'Si lo emitio una persona desde la pantalla de asistencia, quien fue. Habilita el canje en cola (el emisor puede canjearlo por el empleado).';
COMMENT ON COLUMN asistencia_desafios.expira_en IS
  'Vencimiento (120 s desde la emision). Un desafio vencido no se canjea y se descarta.';
COMMENT ON COLUMN asistencia_desafios.usado_en IS
  'Momento del canje. El canje es atomico (UPDATE ... WHERE usado_en IS NULL), asi que un token no se puede usar dos veces.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_asistencia_desafios_token
  ON asistencia_desafios (token_hash);

CREATE INDEX IF NOT EXISTS idx_asistencia_desafios_usuario
  ON asistencia_desafios (usuario_id);

-- FK diferible, como el resto de las que agrega la cadena de migraciones: la
-- restauracion de respaldos recorre las tablas y necesita poder diferirla.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_asistencia_desafios_usuario'
      AND conrelid = to_regclass('asistencia_desafios')
  ) THEN
    ALTER TABLE asistencia_desafios
      ADD CONSTRAINT fk_asistencia_desafios_usuario
      FOREIGN KEY (usuario_id) REFERENCES usuarios (id_usuario)
      ON DELETE CASCADE
      DEFERRABLE INITIALLY IMMEDIATE;
  END IF;
END $$;

DO $$
DECLARE
  credenciales integer;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'usuarios'
      AND column_name = 'qr_token'
  ) THEN
    SELECT count(*) INTO credenciales FROM usuarios WHERE qr_token IS NOT NULL;
    UPDATE usuarios SET qr_token = NULL WHERE qr_token IS NOT NULL;
    RAISE NOTICE 'qr_token: se invalidaron % credencial(es) personales; el QR de asistencia ahora es un desafio del servidor.', credenciales;

    EXECUTE $comment$
      COMMENT ON COLUMN usuarios.qr_token IS
        'RETIRADO en 024. Guardaba la credencial personal que publicaba /api/public/users y aceptaba /api/attendance/register. Queda en NULL; no la escribas ni la leas: la asistencia se prueba con asistencia_desafios.'
    $comment$;
  END IF;
END $$;
