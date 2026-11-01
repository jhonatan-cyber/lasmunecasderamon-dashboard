-- 111) Vencimiento por unidad ----------------------------------------------
-- El vencimiento deja de vivir sólo en la presentación: cada botella física
-- puede guardar la fecha del lote del que salió. Sin esto, comprar un lote
-- nuevo con vencimiento más largo "renovaba" el de las botellas viejas (heredaban
-- la fecha nueva, porque `inventario_unidades` no tenía fecha propia) y no había
-- forma de saber qué unidades eran las que vencían primero.
--
-- - `inventario_unidades.fecha_vencimiento`: fecha del lote de esa botella.
--   La escribe la compra, que ya guardaba elaboración, duración y vencimiento
--   por línea en `detalle_compras`.
-- - `inventario_movimientos.nota`: motivo de los movimientos que lo necesitan.
--   La baja por vencimiento deja constancia de por qué salió el stock.
--
-- El backfill NO copia la fecha de la presentación en las unidades viejas: una
-- copia se congela y después editar la presentación ya no las movería, que es
-- justo lo contrario de lo que hace hoy. Las unidades sin fecha de lote propio
-- quedan en NULL y siguen a su presentación (el `COALESCE` que usa todo el
-- módulo lo resuelve); las que venga de una compra Traen la fecha del lote.

ALTER TABLE inventario_unidades
  ADD COLUMN IF NOT EXISTS fecha_vencimiento date;

ALTER TABLE inventario_movimientos
  ADD COLUMN IF NOT EXISTS nota varchar(300) DEFAULT NULL;

-- El índice acompaña a las consultas de stock vencido (merma y reposición),
-- que filtran por fecha y por estado activo.
CREATE INDEX IF NOT EXISTS idx_unidades_vencimiento
  ON inventario_unidades (fecha_vencimiento)
  WHERE fecha_vencimiento IS NOT NULL;
