-- 114) Retiro trazable de unidades vencidas --------------------------------
-- Conserva un historial inmutable por unidad y las separa del stock activo.
-- Cada fila guarda dónde salió, cuándo, qué costo tuvo y cuándo fue adquirida.

CREATE TABLE IF NOT EXISTS inventario_vencidos_retirados (
  id varchar(36) PRIMARY KEY,
  unidad_id varchar(36) NOT NULL,
  codigo varchar(50) NOT NULL,
  codigo_barras varchar(50),
  producto_id varchar(36),
  presentacion_id varchar(36),
  producto_nombre varchar(180),
  presentacion_nombre varchar(180),
  ubicacion_origen varchar(20) NOT NULL,
  fecha_vencimiento date,
  fecha_retiro timestamptz NOT NULL DEFAULT now(),
  usuario_id varchar(36),
  usuario_nombre varchar(120),
  compra_id varchar(36),
  compra_folio varchar(20),
  fecha_adquisicion timestamptz,
  fecha_elaboracion date,
  duracion_meses integer,
  precio_adquisicion integer NOT NULL DEFAULT 0,
  valor_retirado integer NOT NULL DEFAULT 0,
  nota varchar(300)
);

CREATE INDEX IF NOT EXISTS idx_vencidos_retirados_fecha
  ON inventario_vencidos_retirados (fecha_retiro DESC);
CREATE INDEX IF NOT EXISTS idx_vencidos_retirados_origen
  ON inventario_vencidos_retirados (ubicacion_origen);
CREATE INDEX IF NOT EXISTS idx_vencidos_retirados_presentacion
  ON inventario_vencidos_retirados (presentacion_id);
