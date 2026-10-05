/**
 * Casos de uso de anulación — API pública de servidor del módulo inventario.
 *
 * La anulación de una venta es un hecho de ventas, pero lo que devuelve al bar
 * es inventario: por eso el consumo y su reversión viven aquí y no en el
 * repositorio de ventas. Quien anula (hoy `SaleQueries`) pide la devolución con
 * un `ContextoOperacion` y escribe en la misma transacción que adjusts la plata.
 *
 * No hay efectos posteriores al commit: el stock del bar se lee bajo demanda y
 * la venta ya emite su propia notificación, así que nada externo depende de
 * que esta operación confirme (§6).
 */
import { withTransaction } from '@/lib/database/db';
import { resolverTransaccion } from '@/lib/transaccion/infraestructura';
import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import type { AnulacionStockEntrada, ReversaStockAnulacion } from '../contracts';
import { revertirStockPorAnulacion } from './repositorio';

const SIN_REVERSA: ReversaStockAnulacion = {
  movimientos_revertidos: 0,
  unidades_repuestas: 0,
  ml_repuesto: 0,
  ml_no_repuesto: 0
};

/**
 * Devuelve al bar lo que consumió una venta anulada.
 *
 * Con contexto escribe en la transacción de la anulación: o la venta queda
 * anulada con el stock devuelto, o no queda ninguna de las dos cosas. Sin
 * contexto abre su propia unidad, para los llamadores que reponen stock sin
 * tocar la venta.
 */
export async function revertirStockAnulacion(
  entrada: AnulacionStockEntrada,
  contexto?: ContextoOperacion
): Promise<ReversaStockAnulacion> {
  if (!entrada?.venta_id) return SIN_REVERSA;
  if (contexto) return await revertirStockPorAnulacion(resolverTransaccion(contexto), entrada);
  let resultado: ReversaStockAnulacion = SIN_REVERSA;
  await withTransaction(async trx => {
    resultado = await revertirStockPorAnulacion(trx, entrada);
  });
  return resultado;
}
