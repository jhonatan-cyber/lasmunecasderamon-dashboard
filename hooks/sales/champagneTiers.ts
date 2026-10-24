import type { ChampagneTier } from '@/lib/business/champagne';

export interface ChampagneTierLookup {
  fetchTiers: (productoId: string) => Promise<ChampagneTier[]>;
  getMax: (producto: any) => Promise<number>;
}

export function createChampagneTierLookup(): ChampagneTierLookup {
  const cache: Record<string, ChampagneTier[]> = {};

  const fetchTiers = async (productoId: string): Promise<ChampagneTier[]> => {
    const pid = String(productoId);
    if (cache[pid]) return cache[pid];
    try {
      const res = await fetch(`/api/products/${pid}/tiers`);
      const data = await res.json().catch(() => ({}));
      const tiers = data.success && Array.isArray(data.data) ? data.data : [];
      cache[pid] = tiers;
      return tiers;
    } catch {
      return [];
    }
  };

  const getMax = async (producto: any): Promise<number> => {
    const pid = String(producto.producto_id || producto.id_producto || producto.id);
    const tiers = await fetchTiers(pid);
    return tiers.length > 0 ? Math.max(...tiers.map(tier => tier.anfitrionas)) : 0;
  };

  return { fetchTiers, getMax };
}
