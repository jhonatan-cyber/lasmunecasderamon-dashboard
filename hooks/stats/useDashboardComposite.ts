'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/queryClient';
import { useDashboardSSE } from './useDashboardSSE';
import type { LoggedUsersStatsResponse } from './useLoggedUsersStats';
import type { RoomType } from '@/lib/business/schemas/room';
import type { TimerType } from '@/lib/business/schemas/timer';

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
    projectedRevenue: number | null;
    status: 'closed' | 'insufficient' | 'ready';
    expectedMinutes: number;
    historyCount: number;
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

export interface DashboardBusinessStats {
  caja_id?: string | null;
  balance_total: number;
  total_ventas: number;
  cantidad_ventas: number;
  total_servicios: number;
  cantidad_servicios: number;
  total_efectivo: number;
  total_tarjeta: number;
  total_transferencia: number;
  total_propina: number;
  total_comision: number;
  total_iva: number;
  total_compras: number;
  monto_apertura: number;
  efectivo_en_caja: number;
  tiempo_abierta_horas?: number;
  tiempo_abierta_minutos?: number;
  fecha_apertura_raw?: string | null;
  usuario_id_apertura?: string | null;
}

export interface RecentActivityItem {
  id: string;
  type: 'venta' | 'servicio' | 'pedido' | 'login' | string;
  description: string;
  amount: number | null;
  metadata: string | null;
  createdAt: string;
}

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
  useDashboardSSE();

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
    refetchInterval: 60000,
    refetchOnWindowFocus: true
  });
};
