-- 004) productos.stock_almacen ------------------------------------------------
-- Al registrar un producto se guarda su stock inicial en almacén.
-- Sin módulo de bar por ahora: no hay traspasos ni descuento automático.
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS stock_almacen integer NOT NULL DEFAULT 0;
