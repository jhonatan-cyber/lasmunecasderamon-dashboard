'use client';

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
  // `params` es un objeto nuevo en cada render (el default `{}`), así que
  // memoizar por identidad no serviría; la cadena resultante se compara por
  // valor en la queryKey de TanStack Query, que es lo que importa.
  let fullEndpoint = endpoint;
  if (Object.keys(params).length > 0) {
    const url = new URL(endpoint, window.location.origin);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });
    fullEndpoint = url.pathname + url.search;
  }

  const {
    data: rawData,
    isLoading,
    error,
    refetch
  } = useGenericFetch<T>(fullEndpoint, {
    initialFetch: autoFetch,
    transform: result => {
      if (result.success && result.data) {
        return result.data;
      } else if (result.data) {
        return result.data;
      }
      return result;
    }
  });

  const data = Array.isArray(rawData) && rawData.length > 0 ? rawData[0] : (rawData as any);

  return {
    data,
    isLoading,
    error,
    refetch: async () => {
      await refetch();
    }
  };
}
