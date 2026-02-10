import { useState, useEffect, useMemo, useCallback } from 'react';
import { useGenericFetch } from '../shared/useGenericFetch';

interface CalendarAction {
  tipo: string;
  fecha: string;
  codigo: string;
  cliente: string;
  total: number;
  estado: number;
  descripcion: string;
}

interface CalendarActions {
  [date: string]: CalendarAction[];
}

export const useCalendarActions = (startDate?: string, endDate?: string) => {
  const [mutationError, setMutationError] = useState<string | null>(null);

  // Construir endpoint dinámico con fechas
  const endpoint = useMemo(() => {
    if (!startDate || !endDate) return null;
    return `/api/calendar-actions?startDate=${startDate}&endDate=${endDate}`;
  }, [startDate, endDate]);

  const {
    data: actions,
    isLoading: loading,
    error: fetchError,
    refetch,
  } = useGenericFetch<CalendarActions>(endpoint || '/api/calendar-actions', {
    initialFetch: !!endpoint,
    transform: (data) => (data.success ? data.data : {}),
  });

  const error = fetchError || mutationError;

  const fetchActions = useCallback(async (start: string, end: string) => {
    setMutationError(null);
    // Actualizar endpoint y refetch se hará automáticamente
    await refetch();
  }, [refetch]);

  return { 
    actions: actions?.[0] || {}, 
    loading, 
    error, 
    refetch: fetchActions 
  };
};
