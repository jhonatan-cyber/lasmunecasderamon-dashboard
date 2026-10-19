-- Una venta por entrada: `SaleService.createSale` liga la venta a la primera
-- fila del grupo (ventas.entrada_id). Sin esta restricción, un duplicado hacía
-- que `listarEntradas` devolviera la misma entrada más de una vez por el
-- LEFT JOIN. El índice parcial deja convivir todas las ventas sin entrada.
CREATE UNIQUE INDEX IF NOT EXISTS idx_ventas_entrada_id_unica
  ON ventas(entrada_id)
  WHERE entrada_id IS NOT NULL;

-- El índice no único de la migración 085 queda cubierto por el único parcial.
DROP INDEX IF EXISTS idx_ventas_entrada_id;
