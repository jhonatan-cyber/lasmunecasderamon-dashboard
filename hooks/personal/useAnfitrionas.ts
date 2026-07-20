'use client';

import { useMemo } from 'react';
import { useGenericFetch } from '../shared/useGenericFetch';

interface Anfitriona {
  id_usuario?: number;
  id?: number;
  nombre?: string;
  name?: string;
  apellido?: string;
  lastName?: string;
  nick?: string;
  estado?: number;
  status?: number;
}

type UseAnfitrionasConfig =
  | boolean
  | {
      disponiblesOnly?: boolean;
      loggedIn?: boolean;
      enLocal?: boolean;
      status?: 'active' | 'inactive' | 'all';
    };

export function useAnfitrionas(config: UseAnfitrionasConfig = false) {
  const normalizedConfig =
    typeof config === 'boolean'
      ? { disponiblesOnly: config, loggedIn: false, enLocal: false, status: undefined }
      : {
          disponiblesOnly: config.disponiblesOnly ?? false,
          loggedIn: config.loggedIn ?? false,
          enLocal: config.enLocal ?? false,
          status: config.status
        };

  const endpoint = useMemo(() => {
    if (normalizedConfig.disponiblesOnly) {
      return '/api/anfitrionas/disponibles';
    }

    const searchParams = new URLSearchParams({ anfitrionas: '1' });

    if (normalizedConfig.status) {
      searchParams.set('status', normalizedConfig.status);
    }

    if (normalizedConfig.loggedIn) {
      searchParams.set('loggedIn', '1');
    }

    if (normalizedConfig.enLocal) {
      searchParams.set('enLocal', '1');
    }

    return `/api/users?${searchParams.toString()}`;
  }, [
    normalizedConfig.disponiblesOnly,
    normalizedConfig.enLocal,
    normalizedConfig.loggedIn,
    normalizedConfig.status
  ]);

  const {
    data: anfitrionas,
    isLoading: loading,
    error,
    refetch: getAnfitrionas
  } = useGenericFetch<Anfitriona>(endpoint, {
    transform: result => (result.success ? result.data : [])
  });

  return {
    anfitrionas: anfitrionas || [],
    loading,
    error,
    getAnfitrionas
  };
}
