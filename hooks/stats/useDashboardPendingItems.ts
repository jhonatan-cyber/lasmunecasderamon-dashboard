import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/queryClient';

export interface DashboardPendingItem {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  amount: number;
  createdAt: string;
  href: string;
  kind: 'order' | 'service_request';
}

export interface DashboardPendingItemsResponse {
  orders: DashboardPendingItem[];
  serviceRequests: DashboardPendingItem[];
  summary: {
    totalPendingOrders: number;
    totalPendingServiceRequests: number;
    totalVisibleItems: number;
  };
}

export const useDashboardPendingItems = () => {
  return useQuery<DashboardPendingItemsResponse>({
    queryKey: queryKeys.dashboard.pendingItems(),
    queryFn: async () => {
      const response = await fetch('/api/stats/dashboard-pending-items');
      if (!response.ok) {
        throw new Error('Error al obtener pendientes del dashboard');
      }
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Error en la respuesta del servidor');
      }
      return result.data;
    },
    staleTime: 30000,
    refetchOnWindowFocus: true
  });
};
