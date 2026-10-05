import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import type { ContextoVentaInventario, ConsumoInventarioDetalle, ShotAlert } from '../contracts';
import { consumirStock } from './repositorio';

// Lecturas de la barra (stock abierto y resumen del turno): no abren unidad ni
// emiten efectos, por eso el servicio las reexporta tal cual.
import {
  listarStockBar as listarStockBarInterno,
  obtenerResumenShots as obtenerResumenShotsInterno
} from './stockRepositorio';

export function listarStockBar(...args: Parameters<typeof listarStockBarInterno>) {
  return listarStockBarInterno(...args);
}

export function obtenerResumenShots(...args: Parameters<typeof obtenerResumenShotsInterno>) {
  return obtenerResumenShotsInterno(...args);
}

export function consumirStockBar(
  detalles: ConsumoInventarioDetalle[],
  contextoVenta: ContextoVentaInventario,
  contexto: ContextoOperacion
): Promise<ShotAlert[]> {
  return consumirStock(detalles, contextoVenta, contexto);
}
