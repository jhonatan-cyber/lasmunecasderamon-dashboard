'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/queryClient';
import { useDashboardSSE } from './useDashboardSSE';

interface DashboardSummary {
  totalAsistencias: number;
  totalAnticipos: number;
  totalPropinas: number;
  totalHorasExtras: number;
  totalPedidos: number;
  totalComisiones: number;
  totalServicios: number;
  totalACobrar: number;
  anticiposPendientes: number;
  propinasPendientes: number;
  horasExtrasPendientes: number;
  comisionesPendientes: number;
}

export const useDashboardSummary = () => {
  useDashboardSSE();

  return useQuery<DashboardSummary>({
    queryKey: queryKeys.dashboard.summary(),
    queryFn: async () => {
      const response = await fetch('/api/stats/dashboard-summary');
      if (!response.ok) {
        throw new Error('Error al obtener el resumen del dashboard');
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
