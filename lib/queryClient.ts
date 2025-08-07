import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
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
});

// Configuración para diferentes tipos de datos
export const queryKeys = {
  // Usuarios
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters: any) => [...queryKeys.users.lists(), filters] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.users.details(), id] as const,
  },
  
  // Ventas
  sales: {
    all: ['sales'] as const,
    lists: () => [...queryKeys.sales.all, 'list'] as const,
    list: (filters: any) => [...queryKeys.sales.lists(), filters] as const,
    details: () => [...queryKeys.sales.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.sales.details(), id] as const,
    stats: () => [...queryKeys.sales.all, 'stats'] as const,
  },
  
  // Productos
  products: {
    all: ['products'] as const,
    lists: () => [...queryKeys.products.all, 'list'] as const,
    list: (filters: any) => [...queryKeys.products.lists(), filters] as const,
    details: () => [...queryKeys.products.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.products.details(), id] as const,
    categories: () => [...queryKeys.products.all, 'categories'] as const,
  },
  
  // Clientes
  clients: {
    all: ['clients'] as const,
    lists: () => [...queryKeys.clients.all, 'list'] as const,
    list: (filters: any) => [...queryKeys.clients.lists(), filters] as const,
    details: () => [...queryKeys.clients.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.clients.details(), id] as const,
  },
  
  // Caja
  cashRegister: {
    all: ['cashRegister'] as const,
    status: () => [...queryKeys.cashRegister.all, 'status'] as const,
    stats: () => [...queryKeys.cashRegister.all, 'stats'] as const,
    transactions: () => [...queryKeys.cashRegister.all, 'transactions'] as const,
  },
  
  // Reportes
  reports: {
    all: ['reports'] as const,
    sales: () => [...queryKeys.reports.all, 'sales'] as const,
    products: () => [...queryKeys.reports.all, 'products'] as const,
    users: () => [...queryKeys.reports.all, 'users'] as const,
  },
};

// Funciones helper para invalidar caché
export const invalidateQueries = {
  users: () => queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
  sales: () => queryClient.invalidateQueries({ queryKey: queryKeys.sales.all }),
  products: () => queryClient.invalidateQueries({ queryKey: queryKeys.products.all }),
  clients: () => queryClient.invalidateQueries({ queryKey: queryKeys.clients.all }),
  cashRegister: () => queryClient.invalidateQueries({ queryKey: queryKeys.cashRegister.all }),
  reports: () => queryClient.invalidateQueries({ queryKey: queryKeys.reports.all }),
};

export default queryClient; 