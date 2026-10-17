import { withTransaction, generateUUID, type TransactionQuery } from '@/lib/database/db';
import { cantidadReposicion } from '@/lib/business/stockLimits';
import { sendNotificationToAll } from '@/lib/api/sseService';

export interface OrdenReposicion {
  id: string;
  producto_id: string;
  presentacion_id: string;
  producto: string;
  presentacion: string;
  stock_bodega: number;
  stock_bar: number;
  stock_actual: number;
  stock_minimo: number;
  stock_maximo: number;
  cantidad: number;
  precio_compra: number;
}

/** Después del commit de inventario; serializa comprobaciones y evita órdenes/avisos duplicados. */
export async function sincronizarReposicion(
  trx: TransactionQuery
): Promise<{ rows: OrdenReposicion[]; nuevas: number }> {
  let nuevas = 0;
  const result = await (async () => {
    await trx('SELECT pg_advisory_xact_lock(7942079)');
    const rows = await trx<any[]>(`SELECT p.id, p.stock_minimo, p.stock_maximo,
      p.precio_compra, p.producto_id, pr.nombre AS producto, p.nombre AS presentacion,
      COUNT(u.id) FILTER (WHERE u.ubicacion = 'almacen')::int AS stock_bodega,
      COUNT(u.id) FILTER (WHERE u.ubicacion = 'bar')::int AS stock_bar
      FROM inventario_presentaciones p JOIN productos pr ON pr.id_producto = p.producto_id
      LEFT JOIN inventario_unidades u ON u.presentacion_id = p.id AND u.estado = 'almacen' AND u.ubicacion IN ('almacen', 'bar')
      WHERE pr.estado = 1 AND p.stock_minimo IS NOT NULL
      GROUP BY p.id, pr.nombre ORDER BY p.id`);
    const pendientes = await trx<{ id: string; presentacion_id: string }[]>(
      "SELECT id, presentacion_id FROM ordenes_reposicion WHERE estado = 'pendiente'"
    );
    const orders = new Map(pendientes.map(order => [order.presentacion_id, order]));
    const ids = new Set(rows.map(row => row.id));
    for (const order of pendientes)
      if (!ids.has(order.presentacion_id))
        await trx(
          "UPDATE ordenes_reposicion SET estado = 'resuelta', fecha_mod = CURRENT_TIMESTAMP WHERE id = ?",
          [order.id]
        );
    const output: OrdenReposicion[] = [];
    for (const row of rows) {
      const stock = Number(row.stock_bodega) + Number(row.stock_bar);
      const cantidad = cantidadReposicion(stock, row.stock_minimo, row.stock_maximo);
      const old = orders.get(row.id);
      if (!cantidad) {
        if (old)
          await trx(
            "UPDATE ordenes_reposicion SET estado = 'resuelta', fecha_mod = CURRENT_TIMESTAMP WHERE id = ?",
            [old.id]
          );
        continue;
      }
      const id = old?.id ?? generateUUID();
      if (old) {
        await trx(
          `UPDATE ordenes_reposicion SET cantidad = ?, stock_actual = ?, stock_maximo = ?, fecha_mod = CURRENT_TIMESTAMP
          WHERE id = ? AND (cantidad <> ? OR stock_actual <> ? OR stock_maximo <> ?)`,
          [cantidad, stock, row.stock_maximo, id, cantidad, stock, row.stock_maximo]
        );
      } else {
        await trx(
          'INSERT INTO ordenes_reposicion(id, presentacion_id, cantidad, stock_actual, stock_maximo) VALUES (?, ?, ?, ?, ?)',
          [id, row.id, cantidad, stock, row.stock_maximo]
        );
        const mensaje = `${row.producto} · ${row.presentacion}: quedan ${stock} unidades (Bar + Bodega). Comprar ${cantidad} para llegar al máximo de ${row.stock_maximo}.`;
        for (const role of ['administrador', 'almacen'])
          await trx(
            `INSERT INTO notificaciones(id, rol_destinatario, tipo, titulo, mensaje, datos)
          VALUES (?, ?, 'stock_replenishment', 'Stock bajo: comprar productos', ?, ?)`,
            [
              generateUUID(),
              role,
              mensaje,
              JSON.stringify({ orden_id: id, url: '/purchases/replenishment' })
            ]
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
        precio_compra: Number(row.precio_compra) || 0
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
