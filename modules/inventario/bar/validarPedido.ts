import type { TransactionQuery } from '@/lib/database/db';
import type { OrderCreateType } from '@/lib/business/schemas/order';
import { validarStockPedido } from './consumoRepositorio';
import { validarPreciosConfigurados } from './validarConfiguracionVenta';

/** Comprueba precios, comisiones y asignaciones antes de aceptar el pedido. */
export async function validarConfiguracionPedido(
  trx: TransactionQuery,
  detalles: OrderCreateType['detalles']
) {
  await validarPreciosConfigurados(
    trx,
    detalles.map(d => ({
      ...d,
      producto_id: d.productoId,
      hostess_id: d.hostessId,
      hostesses: d.selectedHostesses
    }))
  );
  await validarStockPedido(trx, detalles);
}
