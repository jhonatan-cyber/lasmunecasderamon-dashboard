import { isChampagneProduct } from '@/components/orders/productModalRules';
import { champagneTierFor, type ChampagneTier } from '@/lib/business/champagne';
import { permiteAnfitrionaConComision } from '@/lib/sales/hostessShortPrices';
import { normalizarProducto, tipoVentaDe, type AddLineContext } from './saleCart';

export interface CartNote {
  level: 'warning' | 'info';
  message: string;
}

export type PrepareCartLineResult =
  | { kind: 'added'; line: AddLineContext; notes: CartNote[] }
  | { kind: 'blocked'; level: 'warning'; message: string };

/**
 * Decide qué línea entra al carro: valida cantidad y stock, recorta las
 * anfitrionas al máximo del producto y resuelve el precio del tramo cuando hay
 * champaña o varias anfitrionas.
 *
 * No toca el estado: devuelve la línea lista, o el motivo del rechazo, para que
 * el hook solo notifique y aplique.
 */
export async function prepareCartLine({
  producto,
  cantidades,
  limiteAnfitrionasDe,
  fetchTiers
}: {
  producto: any;
  cantidades: { [key: string]: number };
  limiteAnfitrionasDe: (p: any) => Promise<number>;
  fetchTiers: (productoId: string, champagne: boolean) => Promise<ChampagneTier[]>;
}): Promise<PrepareCartLineResult> {
  const id = producto.id || producto.id_producto;
  // Un shot no gasta una botella: se sirve de la botella abierta (ml), así que el
  // tope de unidades en bar solo aplica a la venta de botella completa.
  const tipoVenta = tipoVentaDe(producto);
  // Un shot cobrado a precio de anfitriona es un shot más: cambia el precio, no el
  // descuento de ml. Se marca para que reportes y caja lo separen.
  const shotAnfitriona = tipoVenta === 'shot' && Boolean(producto.shot_anfitriona);
  const notes: CartNote[] = [];

  let cantidad = Number(producto.cantidad ?? cantidades[id] ?? 1);
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 2147483647) {
    return {
      kind: 'blocked',
      level: 'warning',
      message: 'La cantidad debe ser un número entero positivo'
    };
  }
  if (tipoVenta !== 'shot' && producto.stock_bar != null && Number(producto.stock_bar) < 1) {
    return {
      kind: 'blocked',
      level: 'warning',
      message: 'Producto sin stock disponible en bar'
    };
  }
  if (
    tipoVenta !== 'shot' &&
    producto.stock_bar !== undefined &&
    producto.stock_bar !== null &&
    cantidad > producto.stock_bar
  ) {
    notes.push({ level: 'warning', message: `Stock máximo en bar: ${producto.stock_bar}` });
    cantidad = Math.max(1, producto.stock_bar);
  }

  // Elegir anfitriona es opcional; si se eligieron más de las que permite el
  // producto, la línea entra al carro recortada al máximo.
  const permiteAnfitriona = permiteAnfitrionaConComision(
    tipoVenta,
    producto.comision ?? producto.commission,
    shotAnfitriona
  );
  const elegidas = (permiteAnfitriona ? producto.selectedHostesses || [] : [])
    .filter((h: unknown) => h !== null && h !== undefined)
    .map((h: string | number) => String(h));
  const limite = elegidas.length ? await limiteAnfitrionasDe({ ...producto, cantidad }) : 0;
  let hostessIds = elegidas.slice(0, limite);
  if (hostessIds.length < elegidas.length) {
    notes.push({
      level: 'info',
      message: `Máximo ${limite} anfitrionas para ${producto.nombre || producto.name || 'este producto'}`
    });
  }

  let precio = producto.precio ?? producto.price ?? 0;
  let comision = producto.comision ?? producto.commission ?? 0;
  const champagne = isChampagneProduct(producto);
  if (
    tipoVenta !== 'shot' &&
    (champagne || Number(producto.max_anfitrionas) >= 2) &&
    hostessIds.length > 0
  ) {
    const pid = String(producto.producto_id || producto.id_producto || producto.id);
    const tiers = await fetchTiers(pid, champagne);
    const tier =
      tiers.find(t => Number(t.anfitrionas) === hostessIds.length) ??
      (champagne && tiers.length ? champagneTierFor(hostessIds.length, tiers) : undefined);
    if (tier) {
      precio = tier.precio;
      comision = tier.comision;
    }
  }

  if (!permiteAnfitrionaConComision(tipoVenta, comision, shotAnfitriona)) hostessIds = [];

  const normalizado = normalizarProducto(producto, {
    id,
    precio,
    comision,
    cantidad,
    hostessIds,
    tipoVenta,
    shotAnfitriona
  });

  return {
    kind: 'added',
    line: { producto, normalizado, tipoVenta, shotAnfitriona, cantidad, precio, comision, id },
    notes
  };
}
