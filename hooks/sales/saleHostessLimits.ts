import { toast } from 'sonner';
import {
  getExplicitMaxAnfitrionas,
  getHostessLimit,
  isChampagneProduct,
  isExpensiveDrink
} from '@/components/orders/productModalRules';
import { resolverVentaProducto, type SaleChoice } from '@/lib/sales/saleChoice';

export const eleccionDe = (p: any): SaleChoice =>
  p?.tipo_venta === 'shot' ? (p?.shot_anfitriona ? 'shot_anfitriona' : 'shot') : 'botella';

export const esBebidaCara = (p: any): boolean =>
  isExpensiveDrink({ precio: resolverVentaProducto(p, eleccionDe(p)).precioBotella });

export interface HostessLimiter {
  limiteAnfitrionasDe: (p: any) => Promise<number>;

  recortePorCantidad: (p: any, cantidad: number) => any[];
}

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
