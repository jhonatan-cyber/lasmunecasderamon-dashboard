import { useState, useEffect } from 'react';

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
  const [actions, setActions] = useState<CalendarActions>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActions = async (start: string, end: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/calendar-actions?startDate=${start}&endDate=${end}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error al cargar acciones: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setActions(result.data);
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (err) {
      console.error('Error al obtener acciones del calendario:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startDate && endDate) {
      fetchActions(startDate, endDate);
    }
  }, [startDate, endDate]);

  return { actions, loading, error, refetch: fetchActions };
};
