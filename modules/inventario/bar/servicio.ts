import type { ContextoOperacion } from '@/lib/transaction/contract';
import type {
  ContextoVentaInventario,
  ConsumoInventarioDetalle,
  DetallePrecioInventario,
  ShotAlert
} from '../contracts';
import {
  consumirColacion as consumirColacionInterno,
  consumirCorteCover as consumirCorteCoverInterno,
  consumirCover as consumirCoverInterno,
  consumirProductoCover as consumirProductoCoverInterno
} from './consumoRepositorio';
import { consumirStock, validarPreciosVenta } from './repositorio';

// Lecturas de la barra (stock abierto y resumen del turno): no abren unidad ni
// emiten efectos, por eso el servicio las reexporta tal cual.
import {
  listarStockBar as listarStockBarInterno,
  obtenerResumenShots as obtenerResumenShotsInterno,
  reordenarStockBar as reordenarStockBarInterno
} from './stockRepositorio';

export function listarStockBar(...args: Parameters<typeof listarStockBarInterno>) {
  return listarStockBarInterno(...args);
}

export function obtenerResumenShots(...args: Parameters<typeof obtenerResumenShotsInterno>) {
  return obtenerResumenShotsInterno(...args);
}

// El orden manual es una escritura del listado del bar, no del catálogo: se
// expone junto a sus lecturas para que la ruta no importe persistencia privada.
export function reordenarStockBar(...args: Parameters<typeof reordenarStockBarInterno>) {
  return reordenarStockBarInterno(...args);
}

/** Valida catálogo y devuelve la categoría real; no valida subtotales con créditos. */
export function validarPreciosVentaBar(
  detalles: DetallePrecioInventario[],
  contexto: ContextoOperacion
) {
  return validarPreciosVenta(detalles, contexto);
}

export function consumirStockBar(
  detalles: ConsumoInventarioDetalle[],
  contextoVenta: ContextoVentaInventario,
  contexto: ContextoOperacion
): Promise<ShotAlert[]> {
  return consumirStock(detalles, contextoVenta, contexto);
}

export function consumirCoverBar(...args: Parameters<typeof consumirCoverInterno>) {
  return consumirCoverInterno(...args);
}

export function consumirColacionBar(...args: Parameters<typeof consumirColacionInterno>) {
  return consumirColacionInterno(...args);
}

export function consumirProductoCoverBar(...args: Parameters<typeof consumirProductoCoverInterno>) {
  return consumirProductoCoverInterno(...args);
}

export function consumirCorteCoverBar(...args: Parameters<typeof consumirCorteCoverInterno>) {
  return consumirCorteCoverInterno(...args);
}
