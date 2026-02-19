import { useState, useEffect, useCallback, useRef } from 'react';


export function useGenericFetch<T>(
  endpoint: string,
  options?: {
    initialFetch?: boolean;
    transform?: (data: any) => T[];
  }
) {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const transformRef = useRef(options?.transform);
  transformRef.current = options?.transform;

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`Error al obtener datos: ${response.statusText}`);
      }
      
      const result = await response.json();
      const processedData = transformRef.current ? transformRef.current(result) : result;
      setData(processedData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    if (options?.initialFetch !== false) {
      fetchData();
    }
  }, [fetchData, options?.initialFetch]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
    setData,
  };
}
