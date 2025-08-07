import { useState, useEffect } from 'react';

interface UseStatsOptions {
  endpoint: string;
  params?: Record<string, string | number | boolean>;
  autoFetch?: boolean;
}

interface UseStatsReturn<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useStats<T = any>({ 
  endpoint, 
  params = {}, 
  autoFetch = true 
}: UseStatsOptions): UseStatsReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Construir URL con parámetros
      const url = new URL(endpoint, window.location.origin);
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Manejar la estructura de respuesta que incluye success y data
      if (result.success && result.data) {
        setData(result.data);
      } else if (result.data) {
        setData(result.data);
      } else {
        setData(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (autoFetch) {
      fetchStats();
    }
  }, [endpoint, JSON.stringify(params), autoFetch]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchStats
  };
} 