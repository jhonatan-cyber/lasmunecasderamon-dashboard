import { CHAMPAGNE_DEFAULT_TIERS, type ChampagneTier } from '@/lib/business/champagne';

export interface ChampagneTierLookup {
  /** Tramos de precio del producto; cae a los por defecto si no hay configurados. */
  fetchTiers: (productoId: string, champagne?: boolean) => Promise<ChampagneTier[]>;
  /** Máximo de anfitrionas que admiten los tramos del producto. */
  getMax: (producto: any) => Promise<number>;
}

/**
 * Caché por montaje del formulario: se crea una instancia por venta abierta, de
 * modo que cerrar y volver a abrir la pantalla revalida los tramos.
 */
export function createChampagneTierLookup(): ChampagneTierLookup {
  const cache: Record<string, ChampagneTier[]> = {};

  const fetchTiers = async (productoId: string, champagne = true): Promise<ChampagneTier[]> => {
    const pid = String(productoId);
    if (cache[pid]) return cache[pid];
    try {
      const res = await fetch(`/api/products/${pid}/tiers?configurados=1`);
      const data = await res.json().catch(() => ({}));
      const tiers =
        data.success && Array.isArray(data.data) && data.data.length > 0
          ? data.data
          : champagne
            ? CHAMPAGNE_DEFAULT_TIERS
            : [];
      cache[pid] = tiers;
      return tiers;
    } catch {
      return champagne ? CHAMPAGNE_DEFAULT_TIERS : [];
    }
  };

  const getMax = async (producto: any): Promise<number> => {
    const pid = String(producto.producto_id || producto.id_producto || producto.id);
    const tiers = await fetchTiers(pid);
    return Math.max(...tiers.map(tier => tier.anfitrionas), 1);
  };

  return { fetchTiers, getMax };
}
