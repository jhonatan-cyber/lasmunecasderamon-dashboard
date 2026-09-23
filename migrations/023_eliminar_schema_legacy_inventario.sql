-- 023) retiro del schema legacy_inventario --------------------------------------
-- El schema lo creo a mano una migracion local (003_inventory.sql) que nunca
-- llego al repositorio, para el primer modulo de inventario. El rediseno de
-- 84b61fd reutiliza tres de esos nombres para tablas distintas, la aplicacion
-- nunca las consulto (todo filtra por current_schema(), o sea public) y las
-- cinco tablas estaban vacias.
--
-- El DDL completo quedo archivado en database/legacy/inventario-prerediseno.sql,
-- con el detalle de por que se retira y como recuperarlas si alguna vez hiciera
-- falta. Esta migracion es el registro de *cuando* desaparecio de cada base: el
-- historial queda en _postgres_migrations.
--
-- Guarda: si alguna tabla del schema conserva filas, aborta con el detalle en vez
-- de borrar. Un DROP SCHEMA silencioso sobre datos reales seria irreversible.
--
-- Idempotente y sin efecto en las bases que nunca tuvieron el schema (instalacion
-- nueva, CI).
DO $$
DECLARE
  tabla record;
  filas bigint;
  con_datos text := '';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'legacy_inventario') THEN
    RAISE NOTICE 'legacy_inventario no existe: nada que retirar.';
    RETURN;
  END IF;

  FOR tabla IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'legacy_inventario' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  LOOP
    EXECUTE format('SELECT count(*) FROM legacy_inventario.%I', tabla.table_name) INTO filas;
    IF filas > 0 THEN
      con_datos := con_datos || format(' %s=%s fila(s);', tabla.table_name, filas);
    END IF;
  END LOOP;

  IF con_datos <> '' THEN
    RAISE EXCEPTION
      'legacy_inventario conserva datos (%). Expórtalos antes de retirar el schema; el DDL original esta en database/legacy/inventario-prerediseno.sql.',
      con_datos;
  END IF;

  DROP SCHEMA legacy_inventario CASCADE;
END $$;
