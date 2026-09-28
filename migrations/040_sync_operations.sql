-- 040) Registro de operaciones que llegan desde el modo offline de la app --
--
-- La app (garzón, barman, cajero) puede crear trabajo sin red y enviarlo al
-- reconectar. El riesgo de un envío diferido no es la latencia: es el reintento.
-- Si el POST /api/orders se corta justo después de que el servidor lo aplicó, la
-- app no sabe si el pedido entró y su reintento natural crea un pedido duplicado.
--
-- pedidos.codigo existe desde antes y es único por convención, pero no tiene
-- constraint: nada impide dos filas con el mismo código. En vez de forzar un
-- índice único sobre datos históricos (que podría fallar y no dice nada sobre
-- otros endpoints), se registra acá cada intento de operación diferida, con la
-- clave que manda el cliente en el header `x-idempotency-key`.
--
-- Estados (vocabulario cerrado):
--   pendiente   fila reclamada, la operación está en curso (o el proceso murió
--               a mitad de camino: esa fila es huérfana y hay que revisarla).
--   aplicada    respondió 2xx; se replica la misma respuesta en un reintento.
--   rechazada   respondió 4xx (error determinista: reintentar daría lo mismo).
--   fallida     el handler lanzó; no se sabe si aplicó, así que un reintento NO
--               re-ejecuta: responde 409 y queda para revisión humana.
--
-- La ausencia de fila = "esta clave nunca se vio": solo entonces se ejecuta.
CREATE TABLE IF NOT EXISTS sync_operations (
  id_cliente varchar(64) PRIMARY KEY,
  usuario_id varchar(36),
  endpoint varchar(160) NOT NULL,
  estado varchar(20) NOT NULL DEFAULT 'pendiente',
  respuesta text,
  intentos integer NOT NULL DEFAULT 1,
  creado_en timestamp without time zone NOT NULL DEFAULT now(),
  aplicado_en timestamp without time zone
);

ALTER TABLE sync_operations
  DROP CONSTRAINT IF EXISTS sync_operations_estado_check;
ALTER TABLE sync_operations
  ADD CONSTRAINT sync_operations_estado_check
  CHECK (estado IN ('pendiente', 'aplicada', 'rechazada', 'fallida'));

-- Revisión de lo que quedó sin resolver (panel de operaciones offline).
CREATE INDEX IF NOT EXISTS idx_sync_operations_estado
  ON sync_operations (estado, creado_en DESC);

-- Trazabilidad por usuario/dispositivo: quién encoló qué y cuándo.
CREATE INDEX IF NOT EXISTS idx_sync_operations_usuario
  ON sync_operations (usuario_id, creado_en DESC);
