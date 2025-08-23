import { useState, useEffect } from 'react';

interface UserStats {
  logueadas: number;
  total: number;
  porcentaje: number;
  usuarios: any[];
}

interface LoggedUsersStats {
  anfitrionas: UserStats;
  garzones: UserStats;
  cajeros: UserStats;
}

interface UseLoggedUsersStatsReturn {
  stats: LoggedUsersStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useLoggedUsersStats = (): UseLoggedUsersStatsReturn => {
  const [stats, setStats] = useState<LoggedUsersStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async (isInitial = false) => {
    try {
      // Solo mostrar loading en la carga inicial
      if (isInitial) {
        setLoading(true);
      }
      setError(null);
      
      const res = await fetch('/api/stats/logged-users', {
        credentials: 'include'
      });
      
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al obtener estadísticas');
      }
      
      setStats(data.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      // Solo mostrar error si no hay datos previos
      if (!stats) {
        setError(message);
      }
      console.error('Error fetching logged users stats:', err);
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    // Carga inicial
    fetchStats(true);
    
    // Actualizar automáticamente cada 30 segundos sin parpadeo visual
    const interval = setInterval(() => {
      fetchStats(false);
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    stats,
    loading,
    error,
    refetch: () => fetchStats(true),
  };
};
