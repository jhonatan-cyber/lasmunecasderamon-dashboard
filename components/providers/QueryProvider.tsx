'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, useEffect } from 'react';

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Tiempo de vida del cachÃ© (5 minutos)
            staleTime: 5 * 60 * 1000,
            // Tiempo de cachÃ© en memoria (10 minutos)
            gcTime: 10 * 60 * 1000,
            // Reintentos en caso de error
            retry: (failureCount, error: any) => {
              // No reintentar en errores 4xx (excepto 408, 429)
              if (
                error?.status >= 400 &&
                error?.status < 500 &&
                error?.status !== 408 &&
                error?.status !== 429
              ) {
                return false;
              }
              // MÃ¡ximo 3 reintentos
              return failureCount < 3;
            },
            // Reintentar con delay exponencial
            retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
            // Optimizado: No refetch en window focus (evita requests innecesarios)
            refetchOnWindowFocus: false,
            // Refetch en reconnect
            refetchOnReconnect: 'always',
            // Optimizado: No refetch en mount si no estÃ¡ stale
            refetchOnMount: false,
            // Optimizado: Refetch interval solo para datos crÃ­ticos
            refetchInterval: false,
            // Optimizado: Mantener datos en background
            structuralSharing: true, // OptimizaciÃ³n de memoria
            // DeduplicaciÃ³n automÃ¡tica de requests
            networkMode: 'online'
          },
          mutations: {
            // Reintentos para mutaciones
            retry: 1,
            // Retry delay para mutaciones
            retryDelay: 1000,
            // Optimizado: Timeout para mutaciones
            networkMode: 'online'
          }
        },
        // ConfiguraciÃ³n global de deduplicaciÃ³n
        queryCache: undefined,
        mutationCache: undefined
      })
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools solo en desarrollo */}
      {mounted && process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} position='bottom' buttonPosition='bottom-right' />
      )}
    </QueryClientProvider>
  );
}

export default QueryProvider;
