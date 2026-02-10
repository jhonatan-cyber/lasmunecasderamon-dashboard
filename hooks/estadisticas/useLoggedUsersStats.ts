import { useState, useEffect, useCallback } from 'react';
import { useGenericFetch } from '../shared/useGenericFetch';

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
  const [silentRefreshing, setSilentRefreshing] = useState(false);

  const {
    data,
    isLoading: loading,
    error,
    refetch: fetchStats,
  } = useGenericFetch<LoggedUsersStats>('/api/stats/logged-users', {
    initialFetch: true,
    transform: (data) => (data.success ? data.data : null),
  });

  const stats = data?.[0] || null;

  // Actualizar automáticamente cada 30 segundos sin parpadeo visual
  useEffect(() => {
    const interval = setInterval(async () => {
      setSilentRefreshing(true);
      await fetchStats();
      setSilentRefreshing(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchStats]);

  return {
    stats,
    loading: loading && !silentRefreshing,
    error,
    refetch: fetchStats
  };
};
