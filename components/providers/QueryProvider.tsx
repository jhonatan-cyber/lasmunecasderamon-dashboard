'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Tiempo de vida del caché (5 minutos)
            staleTime: 5 * 60 * 1000,
            // Tiempo de caché en memoria (10 minutos)
            gcTime: 10 * 60 * 1000,
            // Reintentos en caso de error
            retry: (failureCount, error: any) => {
              // No reintentar en errores 4xx (excepto 408, 429)
              if (error?.status >= 400 && error?.status < 500 && error?.status !== 408 && error?.status !== 429) {
                return false;
              }
              // Máximo 3 reintentos
              return failureCount < 3;
            },
            // Reintentar con delay exponencial
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            // Refetch en window focus solo en producción
            refetchOnWindowFocus: process.env.NODE_ENV === 'production',
            // Refetch en reconnect
            refetchOnReconnect: true,
            // Refetch en mount
            refetchOnMount: true,
          },
          mutations: {
            // Reintentos para mutaciones
            retry: 1,
            // Retry delay para mutaciones
            retryDelay: 1000,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

export default QueryProvider;
