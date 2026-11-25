'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { clearPersistedQueries, setupQueryPersistence } from '@/lib/utils/queryPersistence';

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const { user } = useCurrentUser();
  const userId = user?.id ?? null;
  const activeUserIdRef = useRef<number | null>(null);
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

            // No refetchear al cambiar de pestaña: con staleTime de 5 min y SSE
            // invalidando solo lo afectado, un refetch global al volver a la pestaña
            // hace parecer que el dashboard "se recarga cada rato".
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
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

  // Keep the in-memory and persisted caches isolated to the authenticated user.
  useEffect(() => {
    const previousUserId = activeUserIdRef.current;
    if (previousUserId !== userId) {
      activeUserIdRef.current = userId;
      queryClient.clear();

      if (previousUserId !== null) {
        void clearPersistedQueries(previousUserId);
      }
    }

    if (userId === null) return;

    return setupQueryPersistence(queryClient, userId);
  }, [queryClient, userId]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export default QueryProvider;
