-- 095) Una colación por trabajador y turno de caja, garantizada en la base ---
-- La migración 080 creó `UNIQUE (usuario_id, fecha)` y la 081 la eliminó al
-- pasar la unidad de "día" a "turno de caja", sin reemplazarla. Desde entonces
-- la regla "un corto por trabajador por turno" vivía solo en el código: un
-- segundo escritor (restauración de respaldo, importación o SQL manual)
-- podía duplicarla sin que nada lo notara. Este índice la deja garantizada en
-- la base, y el `SELECT ... FOR UPDATE` del trabajador sigue evitando la
-- carrera entre dos registros simultáneos.
--
-- Se eliminan antes las filas duplicadas que ya existieran, conservando la más
-- antigua: el código nunca las permitió, así que si hay alguna viene de una
-- carga manual. El descuento de stock de esos registros no se revierte, porque
-- los movimientos de inventario son el rastro histórico de lo que salió del bar.
DELETE FROM colaciones c
 USING colaciones d
  WHERE c.usuario_id = d.usuario_id
    AND c.caja_id = d.caja_id
    AND (c.fecha_crea, c.id) > (d.fecha_crea, d.id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_colaciones_usuario_caja
  ON colaciones(usuario_id, caja_id);

-- El detalle del turno se filtra por caja (o por fecha): sin índice es un
-- barrido completo de la tabla.
CREATE INDEX IF NOT EXISTS idx_colaciones_caja
  ON colaciones(caja_id);
