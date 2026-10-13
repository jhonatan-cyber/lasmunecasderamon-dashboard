CREATE TABLE IF NOT EXISTS limpieza_articulos (
  id text PRIMARY KEY, nombre text NOT NULL, unidad text NOT NULL
    CHECK (unidad IN ('unidad', 'litro', 'kilo', 'paquete', 'metro')),
  minimo numeric(15,3) NOT NULL DEFAULT 0 CHECK (minimo >= 0),
  creado_por text NOT NULL, fecha timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS limpieza_articulos_nombre ON limpieza_articulos (lower(nombre));
CREATE TABLE IF NOT EXISTS limpieza_stock (
  articulo_id text NOT NULL REFERENCES limpieza_articulos(id),
  ubicacion text NOT NULL CHECK (ubicacion IN ('almacen','bar','caja','local')),
  cantidad numeric(15,3) NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
  PRIMARY KEY (articulo_id, ubicacion)
);
CREATE TABLE IF NOT EXISTS limpieza_movimientos (
  id text PRIMARY KEY, articulo_id text NOT NULL REFERENCES limpieza_articulos(id),
  tipo text NOT NULL CHECK (tipo IN ('ingreso','traspaso','consumo')),
  cantidad numeric(15,3) NOT NULL CHECK (cantidad > 0),
  origen text CHECK (origen IN ('almacen','bar','caja','local')),
  destino text CHECK (destino IN ('almacen','bar','caja','local')),
  estado text NOT NULL CHECK (estado IN ('pendiente','aceptado','rechazado')),
  nota text NOT NULL DEFAULT '', proveedor text, costo_unitario numeric(15,3),
  creado_por text NOT NULL, recibido_por text,
  fecha timestamptz NOT NULL DEFAULT now(), fecha_resolucion timestamptz,
  CHECK (origen IS NULL OR destino IS NULL OR origen <> destino),
  CHECK ((tipo = 'ingreso' AND origen IS NULL AND destino = 'almacen' AND estado = 'aceptado')
    OR (tipo = 'consumo' AND origen IS NOT NULL AND destino IS NULL AND estado = 'aceptado')
    OR (tipo = 'traspaso' AND origen IS NOT NULL AND destino IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS limpieza_movimientos_fecha ON limpieza_movimientos (fecha DESC);
CREATE INDEX IF NOT EXISTS limpieza_movimientos_pendientes ON limpieza_movimientos (destino) WHERE estado = 'pendiente';
