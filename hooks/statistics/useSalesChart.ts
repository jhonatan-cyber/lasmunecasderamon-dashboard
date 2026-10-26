'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/queryClient';
import logger from '@/lib/utils/logger';

export interface MonthSalesData {
  mes: string;
  mes_num: number;
  total: number;
  cantidad_ventas: number;
}

export interface WeekSalesData {
  dia_semana: string;
  dia_espanol: string;
  orden: number;
  total: number;
}

export interface MonthlyResponse {
  year: number;
  data: MonthSalesData[];
  summary: {
    totalVentas: number;
    promedioMensual: number;
  };
}

export interface WeeklyResponse {
  startDate: string;
  endDate: string;
  data: WeekSalesData[];
  summary: {
    totalVentas: number;
    promedioDiario: number;
  };
}

/**
 * El `status` viaja en el error para que la regla de reintentos del QueryClient
 * (`retry` en lib/api/queryClient.ts) no repita fallos 4xx.
 */
class SalesChartError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'SalesChartError';
    this.status = status;
  }
}

/** TanStack aborta la petición al desmontar (y StrictMode monta dos veces): no es un fallo. */
function esCancelacion(error: unknown): boolean {
  return (error as { name?: string } | null)?.name === 'AbortError';
}

async function fetchSalesChart<T>(
  path: string,
  offset: number,
  signal: AbortSignal | undefined
): Promise<T> {
  const response = await fetch(`${path}?offset=${offset}`, { signal });
  if (!response.ok) {
    throw new SalesChartError(`Error ${response.status} al obtener ${path}`, response.status);
  }

  const result = await response.json();
  if (!result.success) {
    throw new SalesChartError(result.message || `Respuesta inválida de ${path}`, response.status);
  }

  return result.data as T;
}

export const useSalesByMonth = (offset: number) =>
  useQuery<MonthlyResponse>({
    queryKey: queryKeys.stats.salesByMonth(offset),
    queryFn: async ({ signal }) => {
      try {
        return await fetchSalesChart<MonthlyResponse>('/api/stats/sales-by-month', offset, signal);
      } catch (error) {
        if (!esCancelacion(error))
          logger.captureException(error, { context: 'MiniSalesChart:fetchMonthData' });
        throw error;
      }
    },
    // Igual que DASHBOARD_TTL.SALES_BY_MONTH: el servidor cachea 30 s.
    staleTime: 30_000
  });

export const useSalesByWeek = (offset: number) =>
  useQuery<WeeklyResponse>({
    queryKey: queryKeys.stats.salesByWeek(offset),
    queryFn: async ({ signal }) => {
      try {
        return await fetchSalesChart<WeeklyResponse>('/api/stats/sales-by-week', offset, signal);
      } catch (error) {
        if (!esCancelacion(error))
          logger.captureException(error, { context: 'MiniSalesChart:fetchWeekData' });
        throw error;
      }
    },
    staleTime: 30_000
  });
