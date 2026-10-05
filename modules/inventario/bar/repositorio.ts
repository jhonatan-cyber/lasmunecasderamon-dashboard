import { resolverTransaccion } from '@/lib/transaccion/infraestructura';
import { consumirStock as consumirStockEnRepositorio } from './consumoRepositorio';
import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import type { ContextoVentaInventario, ConsumoInventarioDetalle, ShotAlert } from '../contracts';

export function consumirStock(
  detalles: ConsumoInventarioDetalle[],
  contextoVenta: ContextoVentaInventario,
  contexto: ContextoOperacion
): Promise<ShotAlert[]> {
  return consumirStockEnRepositorio(resolverTransaccion(contexto), detalles, contextoVenta);
}
