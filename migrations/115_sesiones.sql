-- 115) Sesiones por dispositivo --------------------------------------------
-- Una fila por inicio de sesión. El token lleva el `sid` de su fila, así que
-- cerrar sesión en un equipo revoca sólo esa fila y deja vivas las demás: el
-- mismo usuario puede trabajar desde varios dispositivos a la vez.
-- `session_version` sigue siendo la palanca de revocación global (cambio de
-- contraseña, cambio de rol, baja de usuario o «cerrar todas las sesiones»).

CREATE TABLE IF NOT EXISTS sesiones (
  id varchar(36) PRIMARY KEY,
  usuario_id varchar(36) NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  creada_en timestamptz NOT NULL DEFAULT now(),
  expira_en timestamptz NOT NULL,
  revocada_en timestamptz,
  ip_address varchar(45)
);

CREATE INDEX IF NOT EXISTS idx_sesiones_usuario_id ON sesiones (usuario_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_vigentes
  ON sesiones (usuario_id) WHERE revocada_en IS NULL;
