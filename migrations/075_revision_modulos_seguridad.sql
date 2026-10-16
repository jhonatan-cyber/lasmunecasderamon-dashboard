-- Revocación de JWT sin esperar su vencimiento. Los tokens anteriores requieren un nuevo login.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 0;

-- La presencia diaria es única incluso al coincidir QR y lectores biométricos.
-- No se eliminan marcas históricas: si hay duplicados, la migración informa el conflicto.
CREATE UNIQUE INDEX IF NOT EXISTS asistencias_usuario_fecha_unique ON asistencias (usuario_id, fecha);

-- La restauración completa difiere todas las FK dentro de su transacción.
ALTER TABLE limpieza_stock ALTER CONSTRAINT limpieza_stock_articulo_id_fkey DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE limpieza_movimientos ALTER CONSTRAINT limpieza_movimientos_articulo_id_fkey DEFERRABLE INITIALLY IMMEDIATE;
