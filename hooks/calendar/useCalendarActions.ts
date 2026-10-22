'use client';

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

const calendarEndpoint = (start: string, end: string) =>
  `/api/calendar?${new URLSearchParams({ startDate: start, endDate: end })}`;
const calendarData = (data: any) =>
  data.success && data.data && typeof data.data === 'object' && !Array.isArray(data.data)
    ? data.data
    : {};

export const useCalendarActions = (startDate?: string, endDate?: string) => {
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [range, setRange] = useState({ start: startDate, end: endDate });
  useEffect(() => {
    setRange({ start: startDate, end: endDate });
  }, [startDate, endDate]);
  const endpoint = useMemo(() => {
    if (!range.start || !range.end) return null;
    return calendarEndpoint(range.start, range.end);
  }, [range.start, range.end]);

  const {
    data: actions,
    isFetching: loading,
    error: fetchError,
    fetchEndpoint
  } = useGenericFetch<CalendarActions>(endpoint || '/api/calendar', {
    initialFetch: !!endpoint,
    transform: calendarData
  });

  const error = fetchError || mutationError;

  const fetchActions = useCallback(
    async (start: string, end: string) => {
      setMutationError(null);
      setRange({ start, end });
      try {
        await fetchEndpoint(calendarEndpoint(start, end));
      } catch (error) {
        setMutationError(error instanceof Error ? error.message : 'Error al obtener calendario');
      }
    },
    [fetchEndpoint]
  );

  return {
    actions: (endpoint && !Array.isArray(actions) ? actions : {}) as unknown as CalendarActions,
    loading,
    error,
    refetch: fetchActions
  };
};
