-- 100) Orden manual del listado del bar ----------------------------------------
-- El listado de productos del bar se ordena a mano con drag & drop y ese orden
-- tiene que sobrevivir a una recarga o a cambiar de módulo. Se guarda por
-- presentación y no en el cliente: así todos los puestos ven el mismo listado.
-- 0 = todavía sin posición manual; esas filas van después de las ordenadas y
-- por nombre, para que una presentación nueva no se cuele al principio.
ALTER TABLE inventario_presentaciones
  ADD COLUMN IF NOT EXISTS bar_display_order integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_presentaciones_bar_orden
  ON inventario_presentaciones (bar_display_order);
