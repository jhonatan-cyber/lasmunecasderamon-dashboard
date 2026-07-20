'use client';

import { useMemo } from 'react';
import { useGenericFetch } from '../shared/useGenericFetch';

export interface Retiro {
  id_retiro: number;
  id_caja: number;
  monto: number;
  motivo: string;
  usuario_id: number;
  fecha_retiro: string;
  usuario_nombre?: string;
}

export function useRetiros(idCaja: string | null) {
  const endpoint = useMemo(
    () => (idCaja ? `/api/cashregister/retiros?id_caja=${idCaja}` : null),
    [idCaja]
  );

  const { data, isLoading, error, refetch } = useGenericFetch<Retiro>(
    endpoint || '/api/cashregister/retiros',
    {
      initialFetch: !!idCaja,
      transform: result => result.data || result
    }
  );

  return {
    retiros: data || [],
    loading: isLoading,
    error,
    refetch
  };
}
