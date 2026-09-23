CREATE TABLE IF NOT EXISTS kiosk_devices (
  id varchar(36) PRIMARY KEY,
  nombre varchar(100) NOT NULL,
  token_hash char(64) NOT NULL UNIQUE,
  creado_por varchar(36) NOT NULL,
  fecha_crea timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ultimo_uso timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expira_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP + interval '30 days',
  revocado_en timestamptz
);
