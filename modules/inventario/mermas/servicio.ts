/**
 * Casos de uso de los lotes vencidos — API pública de servidor del módulo
 * inventario.
 *
 * Dos operaciones: listar qué hay vencido y darlo de baja. La baja deja
 * rastro: las unidades pasan a `inactivo` y queda un movimiento de tipo
 * `merma` en el historial con cuántas botellas salieron y quién lo hizo.
 */
import { withTransaction } from '@/lib/database/db';
import { BusinessError } from '@/lib/errors/errors';
import { sincronizarStockTotal } from '../unidades/repositorio';
import { sincronizarVencimientoProducto } from '../vencimientoProducto';
import {
  darDeBajaLoteVencido as darDeBajaEnRepositorio,
  listarLotesVencidos as listarEnRepositorio
} from './repositorio';
import type { BajaVencidoResultado, LoteVencido } from '../contracts';

/** Presentaciones con stock vencido, de la más antigua a la más reciente. */
export function listarVencidos(): Promise<LoteVencido[]> {
  return listarEnRepositorio();
}

/**
 * Da de baja el stock vencido de una presentación: las unidades vencidas salen
 * del inventario y quedan registradas en el historial como merma.
 */
export async function darDeBajaVencidos(
  presentacionId: string,
  usuarioId: string,
  nota?: string | null
): Promise<BajaVencidoResultado> {
  if (!presentacionId?.trim()) throw new BusinessError('Falta la presentación');
  if (!usuarioId?.trim()) throw new BusinessError('Falta el usuario que registra la baja');
  return await withTransaction(async trx => {
    const baja = await darDeBajaEnRepositorio(trx, presentacionId, usuarioId, nota);
    await sincronizarStockTotal(trx, baja.producto_id);
    // El vencimiento del producto es el del stock que queda: al sacar el
    // lote vencido, el producto pasa a avisar por el siguiente lote.
    await sincronizarVencimientoProducto(trx, baja.producto_id);
    return baja;
  });
}
