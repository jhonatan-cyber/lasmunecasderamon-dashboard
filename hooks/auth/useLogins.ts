import { useState } from 'react';
import { Login } from '@/types/login';
import { useGenericFetch } from '../shared/useGenericFetch';

interface UseLoginsReturn {
  logins: Login[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  cerrarSesiones: () => Promise<boolean>;
}

export const useLogins = (): UseLoginsReturn => {
  const [mutationError, setMutationError] = useState<string | null>(null);

  const {
    data: logins,
    isLoading: loading,
    error: fetchError,
    refetch,
  } = useGenericFetch<Login>('/api/logins', {
    initialFetch: true,
    transform: (data) => data.data || [],
  });

  const error = fetchError || mutationError;

  const cerrarSesiones = async (): Promise<boolean> => {
    try {
      setMutationError(null);
      const response = await fetch('/api/logins/cerrar-sesiones', {
        method: 'POST'
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error al cerrar sesiones');
      }

      await refetch();
      return true;
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : 'Error al cerrar sesiones');
      return false;
    }
  };

  return {
    logins,
    loading,
    error,
    refetch: async () => {
      await refetch();
    },
    cerrarSesiones
  };
};
