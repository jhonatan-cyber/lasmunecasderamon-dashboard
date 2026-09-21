-- Solicitudes de devolucion de saldo (cajero -> admin)
CREATE TABLE IF NOT EXISTS solicitudes_devolucion_saldo (
  id varchar(36) PRIMARY KEY,
  cliente_id varchar(36) NOT NULL REFERENCES clientes(id_cliente) ON DELETE CASCADE,
  monto integer NOT NULL,
  motivo text,
  solicitado_por varchar(36) NOT NULL REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
  estado varchar(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','aprobada','rechazada')),
  fecha_crea timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_resolucion timestamp,
  resuelto_por varchar(36) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
  metodo_pago varchar(20) NOT NULL DEFAULT 'transferencia'
);
CREATE INDEX IF NOT EXISTS idx_solicitudes_devolucion_cliente ON solicitudes_devolucion_saldo(cliente_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_devolucion_estado ON solicitudes_devolucion_saldo(estado);
CREATE INDEX IF NOT EXISTS idx_solicitudes_devolucion_solicitado ON solicitudes_devolucion_saldo(solicitado_por);
