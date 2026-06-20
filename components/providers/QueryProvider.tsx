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
            
            staleTime: 5 * 60 * 1000,
            
            gcTime: 10 * 60 * 1000,
            
            retry: (failureCount, error: any) => {
              
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
            
            networkMode: 'online'
          },
          mutations: {
            
            retry: 1,
            
            retryDelay: 1000,
            
            networkMode: 'online'
          }
        },
        
        queryCache: undefined,
        mutationCache: undefined
      })
  );
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export default QueryProvider;
