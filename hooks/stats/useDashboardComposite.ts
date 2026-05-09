import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/queryClient';
import type { DashboardInsightsResponse } from './useDashboardInsights';
import type { DashboardBusinessStats } from './useDashboardBusinessStats';
import type { LoggedUsersStatsResponse } from './useLoggedUsersStats';
import type { RecentActivityItem } from './useRecentActivity';
import type { RoomType } from '@/lib/business/schemas/room';
import type { TimerType } from '@/lib/business/schemas/timer';
export type { DashboardTrend } from './useDashboardInsights';

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

export interface DashboardCompositeResponse {
  insights: DashboardInsightsResponse;
  cajaStats: DashboardBusinessStats;
  loggedUsers: LoggedUsersStatsResponse;
  timers: TimerType[];
  rooms: RoomType[];
  recentActivity: RecentActivityItem[];
  pendingServiceRequestsCount: number;
  pendingItems: DashboardPendingItemsResponse;
}

export const useDashboardComposite = () => {
  return useQuery<DashboardCompositeResponse>({
    queryKey: queryKeys.dashboard.composite(),
    queryFn: async () => {
      const response = await fetch('/api/dashboard/composite');
      if (!response.ok) {
        throw new Error('Error al obtener datos compuestos del dashboard');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Error en la respuesta del servidor');
      }

      return result.data;
    },
    staleTime: 30000,
    refetchInterval: () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        return 60000;
      }
      return false;
    },
    refetchOnWindowFocus: true
  });
};
