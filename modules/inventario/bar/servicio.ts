import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import type { ContextoVentaInventario, ConsumoInventarioDetalle, ShotAlert } from '../contracts';
import { consumirStock } from './repositorio';

// Lecturas de la barra (stock abierto y resumen del turno): no abren unidad ni
// emiten efectos, por eso el servicio las reexporta tal cual.
export { listarStockBar, obtenerResumenShots } from './stockRepositorio';

export function consumirStockBar(
  detalles: ConsumoInventarioDetalle[],
  contextoVenta: ContextoVentaInventario,
  contexto: ContextoOperacion
): Promise<ShotAlert[]> {
  return consumirStock(detalles, contextoVenta, contexto);
}
