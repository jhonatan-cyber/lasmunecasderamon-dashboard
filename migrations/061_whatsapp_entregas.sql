CREATE TABLE IF NOT EXISTS whatsapp_entregas (
  message_sid varchar(34) PRIMARY KEY,
  account_sid varchar(34) NOT NULL,
  destino varchar(32),
  tipo varchar(16) NOT NULL DEFAULT 'mensaje',
  estado varchar(20) NOT NULL,
  progreso integer NOT NULL DEFAULT 0,
  error_code varchar(16),
  fecha_crea timestamptz NOT NULL DEFAULT now(),
  fecha_mod timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_entregas_fecha ON whatsapp_entregas (fecha_crea DESC);
