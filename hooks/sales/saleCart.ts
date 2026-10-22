import { toast } from 'sonner';
import { isChampagneProduct } from '@/components/orders/productModalRules';
import { calcularPropina, calcularTotalVenta } from '@/lib/business/saleTotals';

export type TipoVenta = 'shot' | 'botella';

export const tipoVentaDe = (producto: any): TipoVenta =>
  producto.tipo_venta === 'shot' ? 'shot' : 'botella';

export interface AddLineContext {
  producto: any;
  normalizado: any;
  tipoVenta: TipoVenta;
  shotAnfitriona: boolean;
  /** Cantidad pedida, antes de recortarla por stock. */
  cantidad: number;
  precio: number;
  comision: number;
  id: string;
}

/** Dos líneas son la misma solo si comparten producto, cobro y beneficiarias. */
export function crearComparadorLinea(ctx: AddLineContext) {
  const { producto, normalizado, tipoVenta, shotAnfitriona, precio, comision } = ctx;
  return (p: any) =>
    p.id === normalizado.id &&
    (p.tipo_venta === 'shot' ? 'shot' : 'botella') === tipoVenta &&
    // Shot de cliente y shot de anfitriona son líneas distintas: no se suman.
    Boolean(p.shot_anfitriona) === shotAnfitriona &&
    JSON.stringify(p.acompanamiento_botella ?? null) ===
      JSON.stringify(producto?.acompanamiento_botella ?? null) &&
    JSON.stringify(p.acompanamiento_corto ?? null) ===
      JSON.stringify(producto.acompanamiento_corto ?? null) &&
    Number(p.precio) === Number(precio) &&
    Number(p.comision ?? 0) === Number(comision) &&
    (p.presentacion_id || null) === (normalizado.presentacion_id || null) &&
    JSON.stringify([...(p.selectedHostesses || [])].sort()) ===
      JSON.stringify([...(normalizado.selectedHostesses || [])].sort());
}

/** Forma canónica de la línea que entra al carro. */
export function normalizarProducto(
  producto: any,
  {
    id,
    precio,
    comision,
    cantidad,
    hostessIds,
    tipoVenta,
    shotAnfitriona
  }: {
    id: string;
    precio: number;
    comision: number;
    cantidad: number;
    hostessIds: string[];
    tipoVenta: TipoVenta;
    shotAnfitriona: boolean;
  }
) {
  return {
    ...producto,
    id,
    nombre: producto.nombre || producto.name || 'Sin nombre',
    precio,
    categoria:
      producto.categoria?.nombre ||
      producto.categoria ||
      producto.category?.nombre ||
      producto.category ||
      '',
    comision,
    cantidad,
    subtotal: precio * cantidad,
    tipo_venta: tipoVenta,
    shot_anfitriona: shotAnfitriona,
    selectedHostesses: hostessIds,
    isChampagne: producto.isChampagne || isChampagneProduct(producto)
  };
}

/**
 * Fusiona la línea con el carro. Los shots comparten un tope de 99 y las
 * botellas descuentan el stock de la presentación ya reservada por otras líneas.
 */
export function agregarLineaAlCarro(prev: any[], ctx: AddLineContext): any[] {
  const { producto, normalizado, tipoVenta, cantidad, precio, id } = ctx;
  const isMatch = crearComparadorLinea(ctx);
  const existing = prev.find(isMatch);
  let agregar = cantidad;

  if (tipoVenta === 'shot') {
    agregar = Math.min(agregar, Math.max(0, 99 - Number(existing?.cantidad ?? 0)));
  } else if (producto.stock_bar != null) {
    // Distintas anfitrionas o precios siguen consumiendo la misma presentación.
    const reservadas = prev.reduce((total, p) => {
      const mismaPresentacion = (p.presentacion_id || p.id) === (normalizado.presentacion_id || id);
      return mismaPresentacion && p.tipo_venta !== 'shot' ? total + Number(p.cantidad) : total;
    }, 0);
    agregar = Math.min(agregar, Math.max(0, Number(producto.stock_bar) - reservadas));
  }

  if (agregar < cantidad) toast.warning('La cantidad solicitada supera el disponible');
  if (agregar <= 0) return prev;

  if (existing) {
    return prev.map(p =>
      isMatch(p)
        ? {
            ...p,
            cantidad: Number(p.cantidad) + agregar,
            subtotal: p.precio * (Number(p.cantidad) + agregar)
          }
        : p
    );
  }
  return [...prev, { ...normalizado, cantidad: agregar, subtotal: precio * agregar }];
}

/** Cambia la cantidad de una línea respetando el stock del resto del carro. */
export function cambiarCantidadEnCarro(
  prev: any[],
  index: number,
  nuevaCantidad: number,
  recortePorCantidad: (p: any, cantidad: number) => any[]
): any[] {
  const actual = prev[index];
  if (!actual) return prev;

  const reservadas = prev.reduce(
    (total, p, i) =>
      i !== index &&
      p.tipo_venta !== 'shot' &&
      (p.presentacion_id || p.id) === (actual.presentacion_id || actual.id)
        ? total + Number(p.cantidad)
        : total,
    0
  );
  const tope =
    actual.tipo_venta === 'shot'
      ? 99
      : actual.stock_bar == null
        ? undefined
        : Math.max(0, Number(actual.stock_bar) - reservadas);

  let final = nuevaCantidad;
  if (tope !== undefined && tope !== null && nuevaCantidad > tope) {
    toast.warning(`Stock máximo en bar: ${tope}`);
    final = tope;
  }
  if (final <= 0) return prev.filter((_, i) => i !== index);

  return prev.map((p, i) =>
    i === index
      ? {
          ...p,
          cantidad: final,
          subtotal: (p.precio || 0) * final,
          selectedHostesses: recortePorCantidad(p, final)
        }
      : p
  );
}

export function calcularTotales(productos: any[], propinaPct: number, enableTip: boolean) {
  const subtotal = productos.reduce((acc, p) => acc + (p?.subtotal || 0), 0);
  const propina = calcularPropina(subtotal, propinaPct, enableTip);
  const total = calcularTotalVenta({ subtotal, propina });
  return { subtotal, propina, total };
}

/** Comisión devengada: solo líneas con anfitrionas y comisión positiva. */
export function calcularComisionTotal(productos: any[]): number {
  return productos.reduce(
    (acc, p) =>
      acc +
      (p.selectedHostesses?.length && Number(p?.comision ?? p?.commission ?? 0) > 0
        ? Number(p?.comision ?? p?.commission ?? 0) * Number(p?.cantidad || 0)
        : 0),
    0
  );
}
