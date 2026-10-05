-- 058) Reversión de stock por anulación: qué venta consumió qué unidades ----
-- Anular una venta devolvía la plata pero no las.existencias: `updateStatus(0)` y
-- `approveAnulacion` ajustan caja, prepago, comisiones y propinas, y nunca
-- tocaban `inventario_unidades`. La botella seguía en el bar con estado 'vendida'
-- y la venta siguiente de lo mismo ya no la encontraba, así que el stock del bar se
-- perdía en cada anulación sin que nadie lo notara.
--
-- Para devolver lo que salió hace falta saber qué salida corresponde a qué venta,
-- y `inventario_movimientos` no lo guardaba: el movimiento de venta anotaba
-- producto, presentación, cantidad y ml, pero no la venta. Este corte añade ese
-- vínculo en dos niveles:
--
--   venta_id          la venta que consumió el stock. Nulo en los movimientos
--                     que no vienen de una venta (ingreso, traspaso).
--   movimiento_origen el movimiento de venta que esta fila está revirtiendo. La
--                     reversión escribe un movimiento nuevo de tipo 'devolucion'
--                     apuntando al original, en vez de borrar el consumo: así el
--                     historial sigue contando lo que salió y lo que volvió.
--
-- Y el segundo nivel, que es el que hace la reversión exacta:
--
--   inventario_movimiento_unidades  qué unidades tocó cada movimiento y cuánta
--                     ml les quitó. Sin esto, devolver ml sería adivinar en qué
--                     botella abrir; con esto, la anulación repone las mismas
--                     botellas que el consumo vació o menguó, y una segunda
--                     anulación no puede devolverlas dos veces porque el módulo
--                     descuenta del saldo lo ya revertido.
--
-- Las filas anteriores quedan con venta_id NULL: no se puede reconstruir a qué
-- venta pertenecía un movimiento viejo, y una anulación sobre esas ventas no
-- repone stock (revierte lo que se puede demostrar, como 057 con la capacidad).
--
-- ml_consumido es el saldo que el movimiento le quitó a esa unidad: la diferencia
-- entre lo que tenía antes y lo que le quedó. Las unidades que se vendieron
-- enteras quedan en 0.
ALTER TABLE inventario_movimientos
  ADD COLUMN IF NOT EXISTS venta_id varchar(36) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS movimiento_origen varchar(36) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_inventario_movimientos_venta
  ON inventario_movimientos (venta_id)
  WHERE venta_id IS NOT NULL;

-- Permite contestar "qué devoluciones tuvo este consumo" con una sola búsqueda:
-- es la consulta que hace idempotente la reversión.
CREATE INDEX IF NOT EXISTS idx_inventario_movimientos_origen
  ON inventario_movimientos (movimiento_origen)
  WHERE movimiento_origen IS NOT NULL;

CREATE TABLE IF NOT EXISTS inventario_movimiento_unidades (
  movimiento_id varchar(36) NOT NULL REFERENCES inventario_movimientos (id) DEFERRABLE,
  unidad_id varchar(36) NOT NULL REFERENCES inventario_unidades (id) DEFERRABLE,
  ml_consumido integer NOT NULL DEFAULT 0,
  CONSTRAINT inventario_movimiento_unidades_pkey PRIMARY KEY (movimiento_id, unidad_id),
  CONSTRAINT inventario_movimiento_unidades_ml_consumido_check CHECK (ml_consumido >= 0)
);

-- Al revés de la PK: "en qué salidas salió esta unidad", que es lo que necesita
-- el inventario para saber si una botella puede reactivarse.
CREATE INDEX IF NOT EXISTS idx_inventario_movimiento_unidades_unidad
  ON inventario_movimiento_unidades (unidad_id);