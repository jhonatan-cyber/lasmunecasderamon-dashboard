import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { z } from 'zod';

const EMPTY_ARRAY: any[] = [];

export function useGenericFetch<T>(
  endpoint: string,
  options?: {
    initialFetch?: boolean;
    transform?: (data: any) => T[];
    schema?: z.ZodSchema<any>;
  }
) {
  const queryClient = useQueryClient();
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
      let rawData = options?.transform ? options.transform(result) : result;

      // Validación con Zod
      if (options?.schema && Array.isArray(rawData)) {
        try {
          z.array(options.schema).parse(rawData);
        } catch (err) {
          console.error(`[Validation Error] ${endpoint}:`, err);
        }
      } else if (options?.schema) {
        try {
          options.schema.parse(rawData);
        } catch (err) {
          console.error(`[Validation Error] ${endpoint}:`, err);
        }
      }

      return rawData;
    },
    enabled: options?.initialFetch !== false,
    staleTime: 1000 * 60 // 1 minute
  });

  const setData = useCallback(
    (updater: any) => {
      queryClient.setQueryData(queryKey, updater);
    },
    [queryClient, queryKey]
  );

  return {
    data: (data || EMPTY_ARRAY) as T[],
    isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
    setData
  };
}
