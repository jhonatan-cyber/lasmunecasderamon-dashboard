-- 096) Fuera las columnas heredadas de `colaciones` --------------------------
-- `producto` (copa/corto), `cantidad`, `precio` y `metodo_pago` quedaron de
-- cuando la colación se cobraba como venta. El módulo no las escribe con
-- ningún otro valor: `cantidad` siempre 1, `precio` siempre 0 y
-- `metodo_pago` siempre 'efectivo' (la colación es gratuita para el
-- trabajador), y `producto` ya no se escribía desde la migración 093, que
-- tuvo que quitarle el NOT NULL para poder insertar. Ninguna consulta las lee.
--
-- Mientras sigan existiendo, el `INSERT` tiene que mandar constantes para
-- satisfacer un `CHECK` que no significa nada, y la lectura del turno tiene
-- que acordarse de ignorarlas. La garantía de que la colación no genera
-- ingreso pasa a estar en el propio esquema: la tabla ya no tiene columnas
-- de precio ni de método de pago.
ALTER TABLE colaciones
  DROP COLUMN IF EXISTS producto,
  DROP COLUMN IF EXISTS cantidad,
  DROP COLUMN IF EXISTS precio,
  DROP COLUMN IF EXISTS metodo_pago;
