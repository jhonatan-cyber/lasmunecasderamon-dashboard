-- 103) Registro de liquidaciones de planilla -------------------------------
-- Pagos a Trabajadores sólo ceroaba los pendientes del trabajador: no quedaba
-- constancia de cuánto se pagó, cuándo ni quién lo ejecutó, así que una
-- planilla pasada no se podía reconstruir y el monto pagado sólo existía en la
-- petición del log de auditoría (que guarda el pedido, no el resultado). Cada
-- pago deja ahora una fila con el monto liquidado y el desglose de los
-- componentes que lo formaron.
--
-- El pago no mueve caja: el sueldo no se descuenta del arqueo (decisión de
-- negocio; ver `PayrollRepository.registrarPago`).
CREATE TABLE IF NOT EXISTS pagos_nomina (
  id varchar(36) NOT NULL,
  usuario_id varchar(36) NOT NULL,
  monto integer NOT NULL,
  componentes jsonb NOT NULL DEFAULT '{}'::jsonb,
  entregado_por varchar(36) DEFAULT NULL,
  fecha_pago timestamp NOT NULL,
  fecha_crea timestamp NOT NULL DEFAULT now(),
  CONSTRAINT pk_pagos_nomina PRIMARY KEY (id),
  CONSTRAINT chk_pagos_nomina_monto CHECK (monto >= 0),
  CONSTRAINT fk_pagos_nomina_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id_usuario) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_pagos_nomina_entregado FOREIGN KEY (entregado_por)
    REFERENCES usuarios (id_usuario) ON DELETE SET NULL ON UPDATE CASCADE
);

-- La lista de la planilla trae la última liquidación de cada trabajador.
CREATE INDEX IF NOT EXISTS idx_pagos_nomina_usuario_fecha
  ON pagos_nomina (usuario_id, fecha_pago DESC);

-- `PAYROLL_SQL` agrega por usuario y estado sobre estas cuatro tablas; con el
-- índice sólo en `usuario_id` cada carga de /payroll barre todas las filas del
-- trabajador para filtrar las pendientes. `asistencias` y `anticipos` ya tienen
-- su par (idx_asistencias_usuario_estado, idx_anticipos_usuario_estado).
CREATE INDEX IF NOT EXISTS idx_detalle_comisiones_usuario_estado
  ON detalle_comisiones (usuario_id, estado);
CREATE INDEX IF NOT EXISTS idx_detalle_propinas_usuario_estado
  ON detalle_propinas (usuario_id, estado);
CREATE INDEX IF NOT EXISTS idx_gratificaciones_usuario_estado
  ON gratificaciones (usuario_id, estado);
CREATE INDEX IF NOT EXISTS idx_horas_extras_usuario_estado
  ON horas_extras (usuario_id, estado);
