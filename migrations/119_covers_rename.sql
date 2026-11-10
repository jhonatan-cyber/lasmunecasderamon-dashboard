-- 119) "Cortesía" -> "cover" también en el esquema ----------------------------
-- La interfaz ya habla de covers desde la 118; este archivo alinea los nombres
-- internos. El código nuevo lee los nombres canónicos, pero la API y la
-- configuración siguen aceptando los antiguos como alias para que la app que ya
-- está instalada siga funcionando (ver módulos de entradas y configuración).
--
-- Renombres:
--   * entradas_clientes.cortesia_estado        -> cover_estado
--   * entradas_clientes.cortesia_entregada_por -> cover_entregada_por
--   * entradas_clientes.cortesia_entregada_at  -> cover_entregada_at
--   * constraint entradas_clientes_cortesia_estado_check -> ..._cover_estado_check
--   * tabla solicitudes_entrega_cortesias      -> solicitudes_entrega_covers
--   * clave monto_base_trago_cortesia_cliente  -> monto_base_trago_cover_cliente
--   * movimientos de inventario con tipo 'cortesia' -> 'cover'
--
-- Se aplica junto con el despliegue del código: el código nuevo no lee los
-- nombres viejos, así que migración y código deben ir en la misma ventana.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'entradas_clientes'
       AND column_name = 'cortesia_estado'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'entradas_clientes'
       AND column_name = 'cover_estado'
  ) THEN
    ALTER TABLE entradas_clientes RENAME COLUMN cortesia_estado TO cover_estado;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'entradas_clientes'
       AND column_name = 'cortesia_entregada_por'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'entradas_clientes'
       AND column_name = 'cover_entregada_por'
  ) THEN
    ALTER TABLE entradas_clientes RENAME COLUMN cortesia_entregada_por TO cover_entregada_por;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'entradas_clientes'
       AND column_name = 'cortesia_entregada_at'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'entradas_clientes'
       AND column_name = 'cover_entregada_at'
  ) THEN
    ALTER TABLE entradas_clientes RENAME COLUMN cortesia_entregada_at TO cover_entregada_at;
  END IF;
END $$;

-- El nombre del CHECK también queda alineado. Renombrar la columna no cambia el
-- nombre de la restricción.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = to_regclass('entradas_clientes')
       AND conname = 'entradas_clientes_cortesia_estado_check'
  ) THEN
    ALTER TABLE entradas_clientes
      RENAME CONSTRAINT entradas_clientes_cortesia_estado_check
      TO entradas_clientes_cover_estado_check;
  END IF;
END $$;

-- La tabla de solicitudes de entrega acompaña el mismo vocabulario. Si ya
-- existe la nueva (reintento) no se toca.
DO $$
BEGIN
  IF to_regclass('solicitudes_entrega_cortesias') IS NOT NULL
     AND to_regclass('solicitudes_entrega_covers') IS NULL THEN
    ALTER TABLE solicitudes_entrega_cortesias RENAME TO solicitudes_entrega_covers;
  END IF;
END $$;

-- La clave de configuración se renombra conservando el valor guardado. Si por
-- un reintento ya existe la canónica, se mantiene esa y no se duplica la fila.
UPDATE configuraciones
   SET clave = 'monto_base_trago_cover_cliente',
       fecha_mod = NOW()
 WHERE clave = 'monto_base_trago_cortesia_cliente'
   AND NOT EXISTS (
     SELECT 1 FROM configuraciones WHERE clave = 'monto_base_trago_cover_cliente'
   );

-- Los movimientos históricos usan 'cortesia' para la bebida servida con una
-- entrada. Desde ahora comparten el tipo 'cover' con el cover analcohólico de
-- ventas; no hay ninguna consulta que dependa de distinguirlos.
UPDATE inventario_movimientos
   SET tipo = 'cover'
 WHERE tipo = 'cortesia';
