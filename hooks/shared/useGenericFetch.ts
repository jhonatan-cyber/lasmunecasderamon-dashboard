'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { z } from 'zod';
import logger from '@/lib/utils/logger';

const EMPTY_ARRAY: any[] = [];

export function useGenericFetch<T>(
  endpoint: string,
  options?: {
    initialFetch?: boolean;
    transform?: (data: any) => T[];
    schema?: z.ZodSchema<any>;

    queryKey?: readonly unknown[];

    staleTime?: number;
  }
) {
  const queryClient = useQueryClient();
  const transform = options?.transform;
  const schema = options?.schema;
  const queryKey = useMemo(() => options?.queryKey ?? [endpoint], [options?.queryKey, endpoint]);

  const fetchData = useCallback(
    async (target: string, signal?: AbortSignal) => {
      const response = await fetch(target, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        cache: 'no-store',
        signal
      });

      if (!response.ok) {
        throw new Error(`Error al obtener datos: ${response.statusText}`);
      }

      const result = await response.json();
      const rawData = transform ? transform(result) : result;

      if (schema && Array.isArray(rawData)) {
        try {
          z.array(schema).parse(rawData);
        } catch (err) {
          logger.captureException(err, { context: 'GenericFetch:fetchData' });
        }
      } else if (schema) {
        try {
          schema.parse(rawData);
        } catch (err) {
          logger.captureException(err, { context: 'GenericFetch:processData' });
        }
      }

      return rawData;
    },
    [transform, schema]
  );

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: ({ signal }) => fetchData(endpoint, signal),
    enabled: options?.initialFetch !== false,
    staleTime: options?.staleTime ?? 1000 * 60
  });

  // Una consulta manual puede usar la URL nueva antes de que React actualice el estado.
  const fetchEndpoint = useCallback(
    (target: string) =>
      queryClient.fetchQuery({
        queryKey: [target],
        queryFn: ({ signal }) => fetchData(target, signal),
        staleTime: 0
      }),
    [queryClient, fetchData]
  );

  const setData = useCallback(
    (updater: any) => {
      queryClient.setQueryData(queryKey, updater);
    },
    [queryClient, queryKey]
  );

  return {
    data: (data || EMPTY_ARRAY) as T[],
    isLoading,
    isFetching,
    error: error instanceof Error ? error.message : null,
    refetch,
    fetchEndpoint,
    setData
  };
}
