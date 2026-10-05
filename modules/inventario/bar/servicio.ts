import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import type { ConsumoInventarioDetalle, ShotAlert } from '../contracts';
import { consumirStock } from './repositorio';

export function consumirStockBar(
  detalles: ConsumoInventarioDetalle[],
  contextoVenta: { usuarioId: string | null; fecha: string },
  contexto: ContextoOperacion
): Promise<ShotAlert[]> {
  return consumirStock(detalles, contextoVenta, contexto);
}
