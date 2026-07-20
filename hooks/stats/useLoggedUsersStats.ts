'use client';

import { useQuery } from '@tanstack/react-query';

export interface LoggedRoleStats {
  logueadas: number;
  usuarios: Array<{ id_usuario: number; nick: string }>;
  total: number;
  porcentaje: number;
}

export interface LoggedUsersStatsResponse {
  anfitrionas: LoggedRoleStats;
  garzones: LoggedRoleStats;
  cajeros: LoggedRoleStats;
}

export const useLoggedUsersStats = () => {
  return useQuery<LoggedUsersStatsResponse>({
    queryKey: ['logged-users-stats'],
    queryFn: async () => {
      const response = await fetch('/api/stats/logged-users');
      if (!response.ok) {
        throw new Error('Error al obtener estadísticas de usuarios logueados');
      }
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Error en la respuesta del servidor');
      }
      return result.data;
    },
    staleTime: 60000,
    refetchOnWindowFocus: true
  });
};
