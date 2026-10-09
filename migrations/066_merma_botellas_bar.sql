-- Registra el volumen residual de una botella abierta por shots al entregarla
-- como vacía dentro de la tolerancia configurable `merma_shots_ml`.
ALTER TABLE inventario_unidades
  ADD COLUMN IF NOT EXISTS ml_merma integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'inventario_unidades_ml_merma_check'
       AND conrelid = 'inventario_unidades'::regclass
  ) THEN
    ALTER TABLE inventario_unidades
      ADD CONSTRAINT inventario_unidades_ml_merma_check CHECK (ml_merma >= 0);
  END IF;
END $$;
