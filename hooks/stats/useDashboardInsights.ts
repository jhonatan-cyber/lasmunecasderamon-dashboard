import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/queryClient';
import { useDashboardSSE } from './useDashboardSSE';

export interface DashboardTrend {
  current: number;
  previous: number;
  delta: number;
  percentChange: number;
  direction: 'up' | 'down' | 'flat';
}

export interface DashboardRankingItem {
  name: string;
  quantity: number;
  amount: number;
}

export interface DashboardInsightsResponse {
  comparisons: {
    salesToday: DashboardTrend;
    servicesToday: DashboardTrend;
    movementToday: DashboardTrend;
    salesWeek: DashboardTrend;
    operationsWeek: DashboardTrend;
  };
  localStatus: {
    rooms: {
      occupied: number;
      free: number;
      total: number;
      occupancyRate: number;
    };
    services: {
      active: number;
      expiringSoon: number;
    };
    orders: {
      open: number;
      serviceRequests: number;
    };
    team: {
      active: number;
      total: number;
      coverageRate: number;
    };
    cash: {
      openRegisters: number;
    };
  };
  rankings: {
    products: DashboardRankingItem[];
    rooms: DashboardRankingItem[];
    staff: DashboardRankingItem[];
  };
  financialSummary: {
    openingAmount: number;
    sales: number;
    services: number;
    tips: number;
    advances: number;
    returns: number;
    withdrawals: number;
    netRevenue: number;
  };
  forecast: {
    projectedRevenue: number;
    currentRevenue: number;
    yesterdayRevenue: number;
    elapsedMinutesToday: number;
    anomalies: Array<{
      id: string;
      tone: 'success' | 'warning' | 'critical';
      title: string;
      description: string;
    }>;
  };
}

export const useDashboardInsights = () => {
  useDashboardSSE();

  return useQuery<DashboardInsightsResponse>({
    queryKey: queryKeys.dashboard.insights(),
    queryFn: async () => {
      const response = await fetch('/api/stats/dashboard-insights');
      if (!response.ok) {
        throw new Error('Error al obtener insights del dashboard');
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
