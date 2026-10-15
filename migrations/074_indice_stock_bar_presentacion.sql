-- Solo unidades elegibles para consumo del bar; conserva el ORDER BY y FOR UPDATE existentes.
CREATE INDEX IF NOT EXISTS idx_unidades_bar_presentacion
  ON inventario_unidades (presentacion_id)
  WHERE estado = 'almacen' AND ubicacion = 'bar';
