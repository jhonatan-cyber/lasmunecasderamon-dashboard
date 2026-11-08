-- 116) WhatsApp por administrador -------------------------------------------
-- Un registro por administrador que opera el WhatsApp del dashboard. Permite que
-- cada admin tenga su propio número de destino y, si lo necesita, su propia cuenta
-- de Twilio (SID, token y número de origen). Al notificar (anulaciones, cierres de
-- caja, anticipos, gratificaciones, alertas de seguridad) el sistema envía a TODOS
-- los administradores activos: cada uno por su cuenta y a su número, así el aviso
-- llega aunque estén en países distintos.
--
-- Las credenciales son opcionales: si un admin las deja vacías se usan las globales
-- (Configuraciones → WhatsApp o el `.env`), que además es el respaldo cuando no hay
-- ningún administrador configurado.
--
-- Sólo pueden figurar usuarios con rol `administrador`; esa validación vive en el
-- servicio (`modules/comunicaciones/whatsapp/administradores.ts`).

CREATE TABLE IF NOT EXISTS whatsapp_administradores (
  usuario_id varchar(36) PRIMARY KEY REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  whatsapp_destino varchar(32) NOT NULL,
  twilio_account_sid varchar(64),
  twilio_auth_token varchar(128),
  twilio_whatsapp_number varchar(32),
  activo smallint NOT NULL DEFAULT 1,
  fecha_crea timestamptz NOT NULL DEFAULT now(),
  fecha_mod timestamptz
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_administradores_activos
  ON whatsapp_administradores (usuario_id) WHERE activo = 1;
