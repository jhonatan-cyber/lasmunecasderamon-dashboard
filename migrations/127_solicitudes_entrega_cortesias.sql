CREATE TABLE IF NOT EXISTS solicitudes_entrega_cortesias (
  id UUID PRIMARY KEY,
  grupo_registro_id VARCHAR(36),
  cliente_nombre VARCHAR(255),
  entrada_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  unidades JSONB NOT NULL DEFAULT '[]'::jsonb,
  monto_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  solicitado_por VARCHAR(36) NOT NULL,
  autorizado_por VARCHAR(36),
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  motivo_rechazo TEXT,
  fecha_solicitud TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_respuesta TIMESTAMPTZ
);
