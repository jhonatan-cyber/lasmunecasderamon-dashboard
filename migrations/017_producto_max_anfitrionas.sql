-- 017) límite de anfitrionas por producto ----------------------------------------
-- Configurado en Ajustes → Comisiones. NULL = default según precio/categoría.
ALTER TABLE productos ADD COLUMN IF NOT EXISTS max_anfitrionas integer;
