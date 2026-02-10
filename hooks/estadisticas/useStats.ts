import { useMemo } from 'react';
import { useGenericFetch } from '../shared/useGenericFetch';

interface UseStatsOptions {
  endpoint: string;
  params?: Record<string, string | number | boolean>;
  autoFetch?: boolean;
}

interface UseStatsReturn<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useStats<T = any>({ 
  endpoint, 
  params = {}, 
  autoFetch = true 
}: UseStatsOptions): UseStatsReturn<T> {
  
  // Construir URL con parámetros
  const fullEndpoint = useMemo(() => {
    if (Object.keys(params).length === 0) return endpoint;
    
    const url = new URL(endpoint, window.location.origin);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });
    return url.pathname + url.search;
  }, [endpoint, JSON.stringify(params)]);

  const {
    data: rawData,
    isLoading,
    error,
    refetch,
  } = useGenericFetch<T>(fullEndpoint, {
    initialFetch: autoFetch,
    transform: (result) => {
      // Manejar la estructura de respuesta que incluye success y data
      if (result.success && result.data) {
        return result.data;
      } else if (result.data) {
        return result.data;
      }
      return result;
    },
  });

  const data = rawData?.[0] || null;

  return {
    data,
    isLoading,
    error,
    refetch
  };
} 