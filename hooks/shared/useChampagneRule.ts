import { useEffect } from 'react';
import { toast } from 'sonner';
import { isChampagneProduct as checkIsChampagne, getHostessLimit } from '@/components/orders/productModalRules';

interface ChampagneProduct {
  categoria?: string;
  category?: string;
  precio?: number;
  price?: number;
  max_anfitrionas?: number | null;
  [key: string]: unknown;
}

interface UseChampagneRuleReturn {
  isChampagneProduct: (producto: ChampagneProduct) => boolean;
  hasChampagneProducts: boolean;
  maxChampagnePrice: number;
  maxAnfitrionas: number;
}

export function useChampagneRule(
  productos: ChampagneProduct[],
  selectedAnfitrionas?: string[],
  setSelectedAnfitrionas?: (value: string[]) => void
): UseChampagneRuleReturn {
  const isChampagneProduct = (producto: ChampagneProduct): boolean => checkIsChampagne(producto as any);

  const hasChampagneProducts = Array.isArray(productos)
    ? productos.some(isChampagneProduct)
    : false;

  const maxChampagnePrice = Array.isArray(productos)
    ? Math.max(...productos.filter(isChampagneProduct).map(p => Number(p.precio ?? p.price ?? 0)))
    : 0;

  const champagneProducts = Array.isArray(productos) ? productos.filter(isChampagneProduct) : [];
  const maxChampagneProduct = champagneProducts.find(
    p => Number(p.precio ?? p.price ?? 0) === maxChampagnePrice
  );
  let maxAnfitrionas = maxChampagneProduct ? getHostessLimit(maxChampagneProduct as any) : 1;
  if (!hasChampagneProducts) maxAnfitrionas = 1;

  useEffect(() => {
    if (
      selectedAnfitrionas &&
      setSelectedAnfitrionas &&
      selectedAnfitrionas.length > maxAnfitrionas
    ) {
      setSelectedAnfitrionas(selectedAnfitrionas.slice(0, maxAnfitrionas));
      toast.info(
        `Se ha ajustado la selección al máximo permitido: ${maxAnfitrionas} anfitriona${maxAnfitrionas !== 1 ? 's' : ''}`
      );
    }
  }, [
    hasChampagneProducts,
    maxChampagnePrice,
    maxAnfitrionas,
    selectedAnfitrionas,
    setSelectedAnfitrionas
  ]);

  return {
    isChampagneProduct,
    hasChampagneProducts,
    maxChampagnePrice,
    maxAnfitrionas
  };
}
