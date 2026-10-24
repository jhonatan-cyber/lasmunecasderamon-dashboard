import { isChampagneProduct } from '@/components/orders/productModalRules';
import {
  champagneTierFor,
  faltaConfiguracionChampagne,
  MENSAJE_CHAMPAGNE_SIN_CONFIGURAR,
  type ChampagneTier
} from '@/lib/business/champagne';
import { permiteAnfitrionaConComision } from '@/lib/sales/hostessShortPrices';
import { normalizarProducto, tipoVentaDe, type AddLineContext } from './saleCart';

export interface CartNote {
  level: 'warning' | 'info';
  message: string;
}

export type PrepareCartLineResult =
  | { kind: 'added'; line: AddLineContext; notes: CartNote[] }
  | { kind: 'blocked'; level: 'warning' | 'error'; message: string };

export async function prepareCartLine({
  producto,
  cantidades,
  limiteAnfitrionasDe,
  fetchTiers
}: {
  producto: any;
  cantidades: { [key: string]: number };
  limiteAnfitrionasDe: (p: any) => Promise<number>;
  fetchTiers: (productoId: string) => Promise<ChampagneTier[]>;
}): Promise<PrepareCartLineResult> {
  const id = producto.id || producto.id_producto;
  const tipoVenta = tipoVentaDe(producto);
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

  const champagne = isChampagneProduct(producto);
  const pid = String(producto.producto_id || producto.id_producto || producto.id);
  const tiers: ChampagneTier[] = tipoVenta !== 'shot' && champagne ? await fetchTiers(pid) : [];
  if (
    tipoVenta !== 'shot' &&
    champagne &&
    faltaConfiguracionChampagne(producto.max_anfitrionas, tiers)
  ) {
    return { kind: 'blocked', level: 'error', message: MENSAJE_CHAMPAGNE_SIN_CONFIGURAR };
  }

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
  if (
    tipoVenta !== 'shot' &&
    (champagne || Number(producto.max_anfitrionas) >= 2) &&
    hostessIds.length > 0
  ) {
    const delProducto = champagne ? tiers : await fetchTiers(pid);
    const tier =
      delProducto.find(t => Number(t.anfitrionas) === hostessIds.length) ??
      (champagne && delProducto.length
        ? champagneTierFor(hostessIds.length, delProducto)
        : undefined);
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
