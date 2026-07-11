'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { setupQueryPersistence, restoreFromCache } from '@/lib/utils/queryPersistence';

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: 10 * 60 * 1000,

            retry: (failureCount, error: any) => {
              // Don't retry 4xx errors (except 408 timeout & 429 rate limit)
              if (
                error?.status >= 400 &&
                error?.status < 500 &&
                error?.status !== 408 &&
                error?.status !== 429
              ) {
                return false;
              }
              return failureCount < 3;
            },

            retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),

            refetchOnWindowFocus: false,
            refetchOnReconnect: 'always',
            refetchOnMount: false,
            refetchInterval: false,
            structuralSharing: true,

            networkMode: 'online',

            // On initial fetch attempt, try IndexedDB cache first as placeholder
            placeholderData: (previousData: any, previousQuery: any) => {
              if (previousData) return previousData;
              return undefined;
            }
          },
          mutations: {
            retry: 1,
            retryDelay: 1000,
            networkMode: 'online'
          }
        }
      })
  );

  // Set up IndexedDB persistence on mount
  useEffect(() => {
    setupQueryPersistence(queryClient);

    return () => {
      (queryClient as any).__queryPersistenceCleanup?.();
    };
  }, [queryClient]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export default QueryProvider;
