import { resolverTransaccion } from '@/lib/transaction/infrastructure';
import { esCategoriaChampagne } from '@/lib/business/champagne';
import { consumirStock as consumirStockEnRepositorio } from './consumoRepositorio';
import type { ContextoOperacion } from '@/lib/transaction/contract';
import type { ContextoVentaInventario, ConsumoInventarioDetalle, ShotAlert } from '../contracts';

export function consumirStock(
  detalles: ConsumoInventarioDetalle[],
  contextoVenta: ContextoVentaInventario,
  contexto: ContextoOperacion
): Promise<ShotAlert[]> {
  return consumirStockEnRepositorio(resolverTransaccion(contexto), detalles, contextoVenta);
}

/** Configuración de champaña de un producto: su máximo y sus tramos guardados. */
export interface ConfiguracionChampana {
  productoId: string;
  categoria: string | null;
  maxAnfitrionas: number | null;
  tiers: Array<{ anfitrionas: number }>;
}

/**
 * Lee, dentro de la unidad, el máximo y los tramos de los productos pedidos.
 *
 * Una sola consulta por tabla para toda la venta: el detalle puede repetir el
 * mismo producto y no hace falta ir a la base por cada línea. Los tramos se
 * consultan sólo para los productos de champaña; el resto de la venta no paga
 * esa consulta.
 */
export async function leerConfiguracionChampana(
  ids: string[],
  contexto: ContextoOperacion
): Promise<ConfiguracionChampana[]> {
  if (ids.length === 0) return [];
  const trx = resolverTransaccion(contexto);
  const productos = await trx<any[]>(
    `SELECT P.id_producto, P.max_anfitrionas, C.nombre AS categoria
       FROM productos P
       LEFT JOIN categorias C ON C.id_categoria = P.categoria_id
      WHERE P.id_producto IN (${ids.map(() => '?').join(',')})`,
    ids
  );
  const idsChampana = productos
    .filter(producto => esCategoriaChampagne(producto.categoria))
    .map(producto => String(producto.id_producto));
  const tiers = idsChampana.length
    ? await trx<any[]>(
        `SELECT producto_id, anfitrionas
           FROM producto_champagne_tiers
          WHERE producto_id IN (${idsChampana.map(() => '?').join(',')})`,
        idsChampana
      )
    : [];
  return productos.map(producto => ({
    productoId: String(producto.id_producto),
    categoria: producto.categoria ?? null,
    maxAnfitrionas: producto.max_anfitrionas ?? null,
    tiers: tiers
      .filter(t => String(t.producto_id) === String(producto.id_producto))
      .map(t => ({ anfitrionas: Number(t.anfitrionas) }))
  }));
}
