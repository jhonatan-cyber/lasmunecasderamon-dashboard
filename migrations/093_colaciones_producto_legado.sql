-- 093) Colaciones sin la columna heredada `producto` ------------------------
-- El registro actual identifica la bebida por `presentacion_id` y guarda
-- `nombre_bebida` / `ml_bebida`; `producto` (copa/corto) quedó como columna
-- histórica. Su NOT NULL impedía insertar cualquier colación nueva, porque el
-- repositorio ya no envía ese valor. Se conserva la columna para los registros
-- antiguos, pero las filas nuevas la dejan en NULL.
ALTER TABLE colaciones
  ALTER COLUMN producto DROP NOT NULL;
