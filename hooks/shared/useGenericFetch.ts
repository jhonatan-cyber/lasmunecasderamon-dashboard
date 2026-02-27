import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

export function useGenericFetch<T>(
  endpoint: string,
  options?: {
    initialFetch?: boolean;
    transform?: (data: any) => T[];
  }
) {
  const queryClient = useQueryClient();

  // Use the endpoint as the query key.
  const queryKey = useMemo(() => [endpoint], [endpoint]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`Error al obtener datos: ${response.statusText}`);
      }

      const result = await response.json();
      return options?.transform ? options.transform(result) : result;
    },
    enabled: options?.initialFetch !== false,
    staleTime: 1000 * 60, // 1 minute
  });

  const setData = useCallback((updater: any) => {
    queryClient.setQueryData(queryKey, updater);
  }, [queryClient, queryKey]);

  return {
    data: data || [],
    isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
    setData,
  };
}
