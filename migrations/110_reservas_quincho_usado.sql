-- 110) Reservas de quincho: estado "usado" ------------------------------------
-- Cuando la fecha de una reserva ya pasó, se marca automáticamente como "usado"
-- para que no se pueda anular (el servicio ya se consumió).
-- Se agrega la columna fecha_uso y se amplía el CHECK de estado.

-- 1) Agregar columna fecha_uso (si no existe).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservas_quincho' AND column_name = 'fecha_uso'
  ) THEN
    ALTER TABLE reservas_quincho ADD COLUMN fecha_uso timestamp DEFAULT NULL;
  END IF;
END $$;

-- 2) Reemplazar el CHECK de estado para incluir 'usado'.
ALTER TABLE reservas_quincho DROP CONSTRAINT IF EXISTS chk_reservas_quincho_estado;
ALTER TABLE reservas_quincho
  ADD CONSTRAINT chk_reservas_quincho_estado CHECK (estado IN ('activa', 'anulada', 'usado'));

-- 3) Marcar como usadas las reservas activas cuya fecha ya pasó (backfill).
UPDATE reservas_quincho
  SET estado = 'usado', fecha_uso = now()
  WHERE fecha_reserva < CURRENT_DATE AND estado = 'activa';
