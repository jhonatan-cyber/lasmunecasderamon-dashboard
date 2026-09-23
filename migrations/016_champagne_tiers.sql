-- 016) tabla de precios champagne por producto ------------------------------------
-- Cada producto champagne define su precio y comisión según la cantidad de
-- anfitrionas (1..N). Si no tiene filas, se usan los valores por defecto
-- del club: 1-2 → 120000/40000, 3 → 160000/60000, 4 → 180000/80000,
-- 5 → 200000/100000 (base 40000 + 20000 por anfitriona extra desde la 3ra).
CREATE TABLE IF NOT EXISTS producto_champagne_tiers (
  id varchar(36) PRIMARY KEY,
  producto_id varchar(36) NOT NULL REFERENCES productos(id_producto) ON DELETE CASCADE,
  anfitrionas integer NOT NULL,
  precio integer NOT NULL DEFAULT 0,
  comision integer NOT NULL DEFAULT 0,
  UNIQUE (producto_id, anfitrionas)
);
CREATE INDEX IF NOT EXISTS idx_champagne_tiers_producto
  ON producto_champagne_tiers (producto_id);
