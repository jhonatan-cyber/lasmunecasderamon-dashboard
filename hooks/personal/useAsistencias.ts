'use client';

import { useMemo, useCallback, useState } from 'react';
import { AsistenciaResumen } from '@/types/asistencia';
import { useCurrentUser } from '../auth/useCurrentUser';
import { useGenericFetch } from '../shared/useGenericFetch';
import { getCurrentTimeKey, getTodayDateKey } from '@/lib/utils/calendarUtils';

interface UseAsistenciasReturn {
  data: AsistenciaResumen[];
  loading: boolean;
  error: string | null;
  fetchAsistencias: () => Promise<void>;
  registrarAsistencia: (usuarioId: string | number) => Promise<boolean>;
}

export default function useAsistencias(): UseAsistenciasReturn {
  const { user } = useCurrentUser();
  const [mutationError, setMutationError] = useState<string | null>(null);

  const endpoint = useMemo(
    () => (user?.role?.toLowerCase() === 'cajero' ? '/api/attendance/user' : '/api/attendance'),
    [user?.role]
  );

  const { data, isLoading, error, refetch } = useGenericFetch<AsistenciaResumen>(endpoint, {
    transform: result => result.data || result
  });

  const registrarAsistencia = useCallback(
    async (usuarioId: string | number): Promise<boolean> => {
      try {
        setMutationError(null);
        const response = await fetch('/api/attendance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            usuario_id: usuarioId,
            fecha: getTodayDateKey(),
            hora: getCurrentTimeKey(),
            estado: 'presente'
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Error al registrar asistencia');
        }

        await refetch();
        return true;
      } catch (error) {
        setMutationError(error instanceof Error ? error.message : 'Error al registrar asistencia');
        return false;
      }
    },
    [refetch]
  );

  const fetchAsistencias = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    data: data || [],
    loading: isLoading,
    error: error || mutationError,
    fetchAsistencias,
    registrarAsistencia
  };
}
