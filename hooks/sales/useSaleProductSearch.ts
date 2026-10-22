'use client';

import { useEffect, useState } from 'react';
import { mapForSaleToCartItem } from '@/lib/sales/forSaleMapper';
import logger from '@/lib/utils/logger';

/** Búsqueda del bar con debounce y protección contra respuestas de consultas anteriores. */
export function useSaleProductSearch(search: string) {
  const [results, setResults] = useState<ReturnType<typeof mapForSaleToCartItem>[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const term = search.trim();
    setResults([]);
    if (!term) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(`/api/products?for_sale=1&term=${encodeURIComponent(term)}`, {
          signal: controller.signal
        });
        const data = await response.json();
        if (!controller.signal.aborted && response.ok && data.success && Array.isArray(data.data)) {
          setResults(data.data.map(mapForSaleToCartItem));
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          logger.captureException(error, { context: 'useSaleProductSearch' });
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [search]);

  return { results, loading };
}
