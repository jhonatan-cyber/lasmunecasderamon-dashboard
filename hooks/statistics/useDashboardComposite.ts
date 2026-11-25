'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/queryClient';
import { DashboardCompositeSchema } from '@/lib/business/schemas/dashboard';
import type { DashboardCompositeResponse } from '@/lib/business/schemas/dashboard';
import logger from '@/lib/utils/logger';

export type {
  DashboardBusinessStats,
  DashboardCompositeResponse,
  DashboardInsightsResponse,
  DashboardPendingItem,
  DashboardPendingItemsResponse,
  DashboardRankingItem,
  DashboardTrend,
  RecentActivityItem
} from '@/lib/business/schemas/dashboard';

export const useDashboardComposite = () => {
  return useQuery<DashboardCompositeResponse>({
    queryKey: queryKeys.dashboard.composite(),
    queryFn: async ({ signal }) => {
      const response = await fetch('/api/dashboard/composite', { signal });
      if (!response.ok) {
        throw new Error('Error al obtener datos compuestos del dashboard');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Error en la respuesta del servidor');
      }

      // Si cambia el contrato, registra la ruta del campo y evita propagar datos inválidos.
      const parsed = DashboardCompositeSchema.safeParse(result.data);
      if (!parsed.success) {
        logger.captureException(parsed.error, { context: 'DashboardComposite:contrato' });
        throw new Error('La respuesta del dashboard no cumple el contrato esperado');
      }

      return parsed.data;
    },
    staleTime: 30000,
    refetchOnWindowFocus: true
  });
};
