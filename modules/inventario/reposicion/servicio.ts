import { withTransaction, generateUUID, type TransactionQuery } from '@/lib/database/db';
import { cantidadReposicion } from '@/lib/business/stockLimits';
import { hoyDelNegocio } from '@/lib/business/vencimiento';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { NotificationService } from '@/modules/comunicaciones';
import type { OrdenReposicion } from '@/modules/inventario/contracts';
import {
  actualizarOrdenReposicion,
  bloquearSincronizacionReposicion,
  crearOrdenReposicion,
  listarOrdenesReposicionPendientes,
  listarPresentacionesParaReposicion,
  resolverOrdenReposicion
} from './repositorio';

/** Después del commit de inventario; serializa comprobaciones y evita órdenes/avisos duplicados. */
export async function sincronizarReposicion(
  trx: TransactionQuery
): Promise<{ rows: OrdenReposicion[]; nuevas: number }> {
  let nuevas = 0;
  const result = await (async () => {
    await bloquearSincronizacionReposicion(trx);
    // Un lote vencido no se puede vender: no cuenta como stock disponible para
    // la reposición, pero sí se reporta para que se le dé de baja.
    const hoy = hoyDelNegocio();
    const rows = await listarPresentacionesParaReposicion(trx, hoy);
    const pendientes = await listarOrdenesReposicionPendientes(trx);
    const orders = new Map(pendientes.map(order => [order.presentacion_id, order]));
    const ids = new Set(rows.map(row => row.id));
    for (const order of pendientes)
      if (!ids.has(order.presentacion_id)) await resolverOrdenReposicion(trx, order.id);
    const output: OrdenReposicion[] = [];
    for (const row of rows) {
      const stock = Number(row.stock_bodega) + Number(row.stock_bar);
      const cantidad = cantidadReposicion(stock, row.stock_minimo, row.stock_maximo);
      const old = orders.get(row.id);
      if (!cantidad) {
        if (old) await resolverOrdenReposicion(trx, old.id);
        continue;
      }
      const id = old?.id ?? generateUUID();
      if (old) {
        await actualizarOrdenReposicion(trx, {
          id,
          cantidad,
          stock,
          stockMaximo: row.stock_maximo
        });
      } else {
        await crearOrdenReposicion(trx, {
          id,
          presentacionId: row.id,
          cantidad,
          stock,
          stockMaximo: row.stock_maximo
        });
        const mensaje = `${row.producto} · ${row.presentacion}: quedan ${stock} unidades (Bar + Bodega). Comprar ${cantidad} para llegar al máximo de ${row.stock_maximo}.`;
        for (const rol of ['administrador', 'almacen'])
          await NotificationService.crearParaRol(
            {
              rol,
              tipo: 'stock_replenishment',
              titulo: 'Stock bajo: comprar productos',
              mensaje,
              data: JSON.stringify({ orden_id: id, url: '/purchases/replenishment' })
            },
            trx
          );
        nuevas++;
      }
      output.push({
        id,
        producto_id: row.producto_id,
        presentacion_id: row.id,
        producto: row.producto,
        presentacion: row.presentacion,
        stock_bodega: Number(row.stock_bodega),
        stock_bar: Number(row.stock_bar),
        stock_actual: stock,
        stock_minimo: row.stock_minimo,
        stock_maximo: row.stock_maximo,
        cantidad,
        precio_compra: Number(row.precio_compra) || 0,
        unidades_vencidas: Number(row.unidades_vencidas) || 0
      });
    }
    return output;
  })();
  return { rows: result, nuevas };
}

export async function revisarReposicion(): Promise<OrdenReposicion[]> {
  const { rows, nuevas } = await withTransaction(sincronizarReposicion);
  if (nuevas)
    sendNotificationToAll('stock_replenishment', { nuevas, url: '/purchases/replenishment' });
  return rows;
}
