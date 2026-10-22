import { toast } from 'sonner';
import {
  getExplicitMaxAnfitrionas,
  getHostessLimit,
  isChampagneProduct,
  isExpensiveDrink
} from '@/components/orders/productModalRules';
import { resolverVentaProducto, type SaleChoice } from '@/lib/sales/saleChoice';

/** Cómo se cobra la línea: el shot del cliente y el de anfitriona son distintos. */
export const eleccionDe = (p: any): SaleChoice =>
  p?.tipo_venta === 'shot' ? (p?.shot_anfitriona ? 'shot_anfitriona' : 'shot') : 'botella';

export const esBebidaCara = (p: any): boolean =>
  isExpensiveDrink({ precio: resolverVentaProducto(p, eleccionDe(p)).precioBotella });

export interface HostessLimiter {
  /** Máximo de anfitrionas para la línea, con la cascada de la UI. */
  limiteAnfitrionasDe: (p: any) => Promise<number>;
  /** Recorta las anfitrionas elegidas cuando baja la cantidad de la línea. */
  recortePorCantidad: (p: any, cantidad: number) => any[];
}

/**
 * La cascada, de más a menos específica: champaña (máximo del producto y de sus
 * tramos), bebida cara (una por unidad, con su máximo explícito) y el resto, una
 * sola. La regla por precio es de la botella: el shot no la hereda.
 */
export function createHostessLimiter(getChampagneMax: (p: any) => Promise<number>): HostessLimiter {
  const limiteAnfitrionasDe = async (p: any): Promise<number> => {
    if (p.tipo_venta === 'shot') return Math.max(1, Number(p.cantidad) || 1);
    const maxExplicito = getExplicitMaxAnfitrionas(p);
    if (isChampagneProduct(p)) return Math.min(getHostessLimit(p), await getChampagneMax(p));
    if (esBebidaCara(p)) {
      const cantidad = Math.max(1, Number(p.cantidad) || 1);
      return maxExplicito ?? cantidad;
    }
    return maxExplicito ?? 1;
  };

  const recortePorCantidad = (p: any, cantidad: number): any[] => {
    const actuales: any[] = Array.isArray(p.selectedHostesses) ? p.selectedHostesses : [];
    if (p.tipo_venta === 'shot') return actuales.slice(0, cantidad);
    if (!actuales.length || isChampagneProduct(p) || !esBebidaCara(p)) return actuales;
    const maxExplicito = getExplicitMaxAnfitrionas(p);
    const limite = maxExplicito ?? cantidad;
    if (actuales.length <= limite) return actuales;
    toast.info(`Máximo ${limite} anfitrionas para ${p.nombre}`);
    return actuales.slice(0, limite);
  };

  return { limiteAnfitrionasDe, recortePorCantidad };
}
