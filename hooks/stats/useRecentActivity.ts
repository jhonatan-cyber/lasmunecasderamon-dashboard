'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/queryClient';
import { useDashboardSSE } from './useDashboardSSE';

export interface RecentActivityItem {
  id: string;
  type: 'venta' | 'servicio' | 'pedido' | 'login' | string;
  description: string;
  amount: number | null;
  metadata: string | null;
  createdAt: string;
}

export const useRecentActivity = () => {
  useDashboardSSE();

  return useQuery<RecentActivityItem[]>({
    queryKey: queryKeys.dashboard.recentActivity(),
    queryFn: async () => {
      const response = await fetch('/api/stats/recent-activity');
      if (!response.ok) {
        throw new Error('Error al obtener la actividad reciente');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Error en la respuesta del servidor');
      }

      return result.data || [];
    },
    staleTime: 15000,
    refetchOnWindowFocus: true
  });
};
