import { resolverTransaccion } from '@/lib/transaccion/infraestructura';
import { consumirStock as consumirStockEnRepositorio } from './consumoRepositorio';
import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import type { ConsumoInventarioDetalle, ShotAlert } from '../contracts';

export function consumirStock(
  detalles: ConsumoInventarioDetalle[],
  contextoVenta: { usuarioId: string | null; fecha: string },
  contexto: ContextoOperacion
): Promise<ShotAlert[]> {
  return consumirStockEnRepositorio(resolverTransaccion(contexto), detalles, contextoVenta);
}
