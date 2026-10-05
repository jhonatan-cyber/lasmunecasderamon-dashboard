-- 059) La FK de gratificaciones.solicitante_id vuelve a ser diferible -----------
-- La 001 normalizó todas las FK a DEFERRABLE porque la restauración de
-- respaldos (lib/database/maintenance.ts) depende de poder diferirlas, y la 022
-- repitió esa normalización para las FK que fueran apareciendo despues (la 003,
-- la 018 y la 020). La 037 llegó despues de las dos y añadió la suya con un `ADD CONSTRAINT`
-- normal: en una instalación nueva nunca se ejecuta (el dump ya trae la columna y
-- la restricción, así que el runner la adopta por efectos) y la 001 deja la
-- restricción diferible; en un entorno que ya estaba desplegado sí se ejecutó, y
-- ahí la FK quedó sin diferir.
--
-- Consecuencia: la misma definición de esquema installations nuevas y entornos
-- existentes, y `snapshotDatabase`/`restoreDatabase` dejan de poder diferir esa
-- FK. Por eso `db:parity` salía rojo con esta única diferencia, y por eso no
-- era cosmético: el respaldo de una base con gratificaciones dependía del orden
-- en que el snapshot recorre las tablas.
--
-- Se corrige en los entornos que ya la tienen mal, sin tocar las columnas ni
-- recrear la fila: `ALTER CONSTRAINT ... DEFERRABLE INITIALLY IMMEDIATE` es
-- idempotente y no reescribe datos. Es el mismo tratamiento que dio la 022(f).
DO $$
DECLARE
  tabla text;
BEGIN
  SELECT conrelid::regclass::text INTO tabla
    FROM pg_constraint
   WHERE conname = 'fk_gratificaciones_solicitante'
     AND NOT condeferrable;

  IF tabla IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %s ALTER CONSTRAINT %I DEFERRABLE INITIALLY IMMEDIATE',
                   tabla, 'fk_gratificaciones_solicitante');
    RAISE NOTICE '[059] fk_gratificaciones_solicitante deferida: la 037 la creo sin diferir';
  END IF;
END $$;
