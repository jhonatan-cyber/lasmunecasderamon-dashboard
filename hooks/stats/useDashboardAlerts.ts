'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/queryClient';
import { useDashboardSSE } from './useDashboardSSE';

export interface DashboardAlertItem {
  id: string;
  title: string;
  description: string;
  value: number;
  severity: 'critical' | 'warning' | 'success';
  href: string;
  ctaLabel: string;
}

export interface DashboardAlertsResponse {
  alerts: DashboardAlertItem[];
  summary: {
    openCashRegisters: number;
    pendingOrders: number;
    pendingServiceRequests: number;
    expiringServices: number;
    occupiedRooms: number;
    freeRooms: number;
    totalRooms: number;
    criticalCount: number;
    warningCount: number;
  };
}

export const useDashboardAlerts = () => {
  useDashboardSSE();

  return useQuery<DashboardAlertsResponse>({
    queryKey: queryKeys.dashboard.alerts(),
    queryFn: async () => {
      const response = await fetch('/api/stats/dashboard-alerts');
      if (!response.ok) {
        throw new Error('Error al obtener alertas del dashboard');
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
