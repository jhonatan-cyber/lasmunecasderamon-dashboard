import { useEffect } from 'react';
import { toast } from 'sonner';

interface ChampagneProduct {
  categoria?: string;
  category?: string;
  precio?: number;
  price?: number;
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
  const isChampagneProduct = (producto: ChampagneProduct): boolean => {
    const categoria = (producto?.categoria || producto?.category || '').toLowerCase();
    return (
      categoria.includes('champaña') ||
      categoria.includes('shampaña') ||
      categoria.includes('champagne')
    );
  };

  const hasChampagneProducts = Array.isArray(productos)
    ? productos.some(isChampagneProduct)
    : false;

  const maxChampagnePrice = Array.isArray(productos)
    ? Math.max(...productos.filter(isChampagneProduct).map(p => Number(p.precio ?? p.price ?? 0)))
    : 0;

  let maxAnfitrionas = 1;
  if (hasChampagneProducts) {
    if (maxChampagnePrice >= 240000) maxAnfitrionas = 5;
    else if (maxChampagnePrice >= 200000) maxAnfitrionas = 4;
    else if (maxChampagnePrice >= 140000) maxAnfitrionas = 3;
    else if (maxChampagnePrice >= 120000) maxAnfitrionas = 2;
    else maxAnfitrionas = 1;
  }

  
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
