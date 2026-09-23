-- 022) alineacion de esquema entre las dos rutas de instalacion ------------------
-- El esquema se define hoy en dos lugares: el dump de `database/` y esta cadena
-- de migraciones. Las dos rutas de instalacion (base nueva desde el dump +
-- migraciones, y entorno existente migrado) se desviaron entre si. Medido con
-- `pnpm db:diff <operativa> <base nueva>` antes de este archivo:
--
--   a) inventario_presentaciones.opciones_venta y inventario_movimientos.opciones_venta
--      son jsonb en los entornos migrados y text en las instalaciones nuevas: el
--      dump declara text y el `ADD COLUMN IF NOT EXISTS ... jsonb` de la 011 no
--      cambia el tipo de una columna que ya existe.
--   b) inventario_unidades.transferencia_id tiene FK en los entornos migrados y
--      NO la tiene en las instalaciones nuevas: el dump declara la columna sin
--      REFERENCES, y el `ADD COLUMN IF NOT EXISTS ... REFERENCES` de la 012 se
--      salta la clausula completa por existir la columna. Sin FK, un
--      transferencia_id huerfano es posible.
--   c) los 5 FK del modulo de inventario que declara el dump quedan con nombre
--      canonico y DEFERRABLE en las instalaciones nuevas, y con nombre
--      autogenerado y NO diferible donde los creo la migracion. La restauracion
--      de respaldos depende de que las FK sean diferibles (ver 001).
--   d) categorias.descripcion quedo con el default corrupto ('Sin descripciÃ³n')
--      en los entornos migrados.
--   e) inventario_unidades.codigo_barras tiene dos restricciones unicas en las
--      instalaciones nuevas (la del dump y la 009); sobra una.
--
-- El objetivo de este archivo es que las dos rutas converjan, de modo que
-- `pnpm db:diff` no reporte nada. Es idempotente y defensivo: se puede aplicar
-- sobre cualquiera de los dos estados y repetirse sin efectos.

-- a) opciones_venta: text -> jsonb -----------------------------------------------
DO $$
DECLARE objetivo record;
BEGIN
  FOR objetivo IN
    SELECT table_name FROM (VALUES ('inventario_presentaciones'), ('inventario_movimientos')) AS t(table_name)
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = objetivo.table_name
        AND column_name = 'opciones_venta'
        AND data_type <> 'jsonb'
    ) THEN
      -- Los valores los escribio la app con JSON.stringify, asi que el cast es seguro.
      EXECUTE format(
        'ALTER TABLE %I ALTER COLUMN opciones_venta TYPE jsonb USING opciones_venta::jsonb',
        objetivo.table_name
      );
    END IF;
  END LOOP;
END $$;

-- b) y c) FK del modulo de inventario: nombre canonico, diferibles y completas -----
DO $$
DECLARE objetivo record;
BEGIN
  FOR objetivo IN
    SELECT * FROM (VALUES
      ('inventario_presentaciones', 'inventario_presentaciones_producto_id_fkey', 'fk_inv_pres_producto'),
      ('inventario_unidades',       'inventario_unidades_producto_id_fkey',       'fk_inv_unid_producto'),
      ('inventario_unidades',       'inventario_unidades_presentacion_id_fkey',   'fk_inv_unid_presentacion'),
      ('inventario_unidades',       'inventario_unidades_transferencia_id_fkey',  'fk_inv_unid_transferencia'),
      ('producto_champagne_tiers',  'producto_champagne_tiers_producto_id_fkey',  'fk_champagne_tiers_producto')
    ) AS t(table_name, old_name, new_name)
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = objetivo.old_name AND conrelid = to_regclass(objetivo.table_name)
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I RENAME CONSTRAINT %I TO %I',
        objetivo.table_name, objetivo.old_name, objetivo.new_name
      );
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = objetivo.new_name AND conrelid = to_regclass(objetivo.table_name) AND NOT condeferrable
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I ALTER CONSTRAINT %I DEFERRABLE INITIALLY IMMEDIATE',
        objetivo.table_name, objetivo.new_name
      );
    END IF;
  END LOOP;
END $$;

-- b) la FK que falta cuando la columna la creo el dump ----------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
    WHERE c.conrelid = 'inventario_unidades'::regclass AND c.contype = 'f'
      AND a.attname = 'transferencia_id'
  ) THEN
    ALTER TABLE inventario_unidades
      ADD CONSTRAINT fk_inv_unid_transferencia
      FOREIGN KEY (transferencia_id) REFERENCES inventario_movimientos (id)
      DEFERRABLE INITIALLY IMMEDIATE;
  END IF;
END $$;

-- d) default de categoria sin mojibake -------------------------------------------
ALTER TABLE categorias ALTER COLUMN descripcion SET DEFAULT 'Sin descripción';

-- e) una sola restriccion unica para el codigo de barras de la unidad -------------
ALTER TABLE inventario_unidades DROP CONSTRAINT IF EXISTS inventario_unidades_codigo_barras_key;

-- f) toda FK diferible, como normalizo la 001 --------------------------------------
-- La 001 hizo diferibles las FK que existian entonces, pero las que agregaron la
-- 003 y el modulo de compras (018 y 020) quedaron no diferibles. La restauracion
-- de respaldos (lib/database/maintenance.ts) depende de poder diferirlas, y hoy
-- funciona solo porque el snapshot recorre las tablas en un orden que respeta las
-- dependencias.
DO $$
DECLARE fk record;
BEGIN
  FOR fk IN
    SELECT conrelid::regclass AS table_name, conname
    FROM pg_constraint
    WHERE contype = 'f' AND connamespace = current_schema()::regnamespace AND NOT condeferrable
  LOOP
    EXECUTE format(
      'ALTER TABLE %s ALTER CONSTRAINT %I DEFERRABLE INITIALLY IMMEDIATE',
      fk.table_name, fk.conname
    );
  END LOOP;
END $$;
