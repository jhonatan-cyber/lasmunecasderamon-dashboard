-- 043) Cierre de caja autorizado por el administrador + descuento de saldos de clientes
--
-- El cierre deja de ser una acción directa del cajero: pasa a ser una solicitud
-- que el administrador autoriza (link con token por WhatsApp, mismo patrón que
-- las anulaciones). Mientras nadie responda, la caja **sigue abierta** y sin
-- cerrar: si el cajero se va, la caja queda abierta a propósito, no cerrada de
-- prepo.
--
-- Además, al cerrar se descuentan del efectivo los saldos que los clientes
-- todavía tienen cargados (`clientes.saldo > 0`, el prepago sin consumir). Ese
-- dinero se cobró en un turno anterior y no está en el cajón, así que el monto
-- de cierre tiene que reflejarlo: si no, el arqueo da faltante por plata que
-- nunca estuvo ahí.
--
-- Nota: `saldo_clientes_descontado` guarda lo efectivamente descontado en **ese**
-- cierre (se recalcula al autorizar, no se arrastra desde la solicitud), para que
-- el detalle de la caja muestre el número real y no una estimación vieja.

ALTER TABLE cajas ADD COLUMN IF NOT EXISTS cierre_solicitado_en timestamp;
ALTER TABLE cajas ADD COLUMN IF NOT EXISTS saldo_clientes_descontado integer NOT NULL DEFAULT 0;

-- Solicitudes de cierre. Estados (vocabulario cerrado):
--   pendiente  la caja sigue abierta, esperando al administrador.
--   aprobada   la caja se cerró (una sola vez; la clave de idempotencia es el token).
--   rechazada  el cierre no se hizo y la caja sigue abierta.
CREATE TABLE IF NOT EXISTS solicitudes_cierre_caja (
  id varchar(36) NOT NULL,
  caja_id varchar(36) NOT NULL,
  token varchar(255) NOT NULL,
  estado varchar(14) DEFAULT 'pendiente',
  monto_cierre_calculado integer NOT NULL DEFAULT 0,
  saldo_clientes_descontado integer NOT NULL DEFAULT 0,
  solicitado_por varchar(255) DEFAULT 'Usuario del Sistema',
  usuario_id_solicita varchar(36) DEFAULT NULL,
  motivo varchar(500) DEFAULT 'Cierre de turno',
  fecha_solicitud timestamp NOT NULL DEFAULT now(),
  fecha_resolucion timestamp DEFAULT NULL,
  resuelto_por varchar(255) DEFAULT NULL,
  motivo_rechazo varchar(500) DEFAULT NULL
);

ALTER TABLE solicitudes_cierre_caja
  DROP CONSTRAINT IF EXISTS chk_solicitudes_cierre_caja_estado;
ALTER TABLE solicitudes_cierre_caja
  ADD CONSTRAINT chk_solicitudes_cierre_caja_estado
  CHECK (estado IN ('pendiente', 'aprobada', 'rechazada'));

-- El link del WhatsApp se resuelve por token.
CREATE UNIQUE INDEX IF NOT EXISTS idx_solicitudes_cierre_caja_token
  ON solicitudes_cierre_caja (token);

-- Una sola solicitud pendiente por caja: dos cajeros pidiendo el cierre del
-- mismo turno generarían dos autorizaciones para un solo cierre.
CREATE UNIQUE INDEX IF NOT EXISTS idx_solicitudes_cierre_caja_pendiente
  ON solicitudes_cierre_caja (caja_id)
  WHERE estado = 'pendiente';

-- Revisión de lo que quedó sin resolver (panel de cierres pendientes).
CREATE INDEX IF NOT EXISTS idx_solicitudes_cierre_caja_estado
  ON solicitudes_cierre_caja (estado, fecha_solicitud DESC);
