-- 051) Métrica de asistencia biométrica: origen de cada asistencia
--
-- El panel de Configuraciones muestra "asistencias biométricas de hoy". Para
-- que el número sea exacto (y no una aproximación por joins contra
-- biometric_events), cada fila de `asistencias` marca su ORIGEN:
--   'biometrico' → la insertó el flujo del lector (push, stream en vivo o poller);
--   'sistema'    → el resto (QR del kiosko, código del local, manual, masivo).
--
-- El default cubre las filas históricas y las vías que no marcan nada.

ALTER TABLE asistencias
  ADD COLUMN IF NOT EXISTS origen varchar(20) NOT NULL DEFAULT 'sistema';

CREATE INDEX IF NOT EXISTS idx_asistencias_origen_fecha
  ON asistencias (origen, fecha)
  WHERE origen = 'biometrico';

COMMENT ON COLUMN asistencias.origen IS
  'Via que insertó la asistencia: biometrico (lector) o sistema (QR/codigo/manual).';
