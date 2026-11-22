-- Tabla de solicitudes de anulación de entradas pendientes.
-- Sigue el mismo patrón que solicitudes_anulacion_ventas: un token único
-- permite que el administrador apruebe o rechace desde un link.
-- El método de devolución se selecciona al aprobar, no al solicitar.

CREATE TABLE IF NOT EXISTS solicitudes_anulacion_entradas (
  id varchar(36) NOT NULL,
  entrada_id varchar(36) NOT NULL,
  token varchar(255) NOT NULL,
  estado varchar(14) NOT NULL DEFAULT 'pendiente',
  fecha_solicitud timestamp NOT NULL,
  solicitado_por varchar(255) NOT NULL,
  motivo varchar(500) DEFAULT 'Motivo no especificado',
  monto integer NOT NULL DEFAULT 0,
  metodo_devolucion varchar(20) DEFAULT NULL,
  procesado_por varchar(36) DEFAULT NULL,
  fecha_procesamiento timestamp DEFAULT NULL
);

ALTER TABLE solicitudes_anulacion_entradas
  ADD CONSTRAINT chk_solicitudes_anulacion_entradas_estado
    CHECK (estado IN ('pendiente', 'confirmada', 'rechazada'));

ALTER TABLE solicitudes_anulacion_entradas
  ADD CONSTRAINT chk_solicitudes_anulacion_entradas_metodo
    CHECK (metodo_devolucion IS NULL OR metodo_devolucion IN ('efectivo', 'tarjeta', 'transferencia', 'prepago'));

CREATE INDEX IF NOT EXISTS idx_solicitudes_anulacion_entradas_token
  ON solicitudes_anulacion_entradas(token);

CREATE INDEX IF NOT EXISTS idx_solicitudes_anulacion_entradas_entrada
  ON solicitudes_anulacion_entradas(entrada_id);

CREATE INDEX IF NOT EXISTS idx_solicitudes_anulacion_entradas_estado
  ON solicitudes_anulacion_entradas(estado);
