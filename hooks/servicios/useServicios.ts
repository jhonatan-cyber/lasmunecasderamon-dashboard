import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { ServicioWithDetails } from '@/types/servicio';
import { useGenericFetch } from '../shared/useGenericFetch';
import { useSharedSSE } from '@/hooks/shared';

// QueryKey compartido para invalidar desde cualquier mutación
export const SERVICIOS_QUERY_KEY = ['servicios'] as const;

export function useServicios() {
  const queryClient = useQueryClient();
  const [includeAll, setIncludeAll] = useState(false); // Iniciar con false = servicios activos (estado 2,3,4)
  const endpoint = useMemo(() => {
    const ep = includeAll ? '/api/servicios?all=true' : '/api/servicios?all=false';
    return ep;
  }, [includeAll]);

  const serviciosQueryKey = useMemo(
    () => [...SERVICIOS_QUERY_KEY, includeAll ? 'all' : 'active'] as const,
    [includeAll]
  );

  const {
    data: servicios,
    isLoading: fetchLoading,
    error: fetchError,
    refetch,
    setData: setServicios
  } = useGenericFetch<ServicioWithDetails>(endpoint, {
    initialFetch: true,
    queryKey: serviciosQueryKey,
    staleTime: 5000, // 5 segundos — refresco rápido sin recargar
    transform: data => {
      if (data.success && data.data) {
        // La respuesta puede ser { data: [...] } o [...] directamente
        let rawData = data.data;
        if (data.data.data) {
          rawData = data.data.data;
        } else if (data.data.data?.data) {
          rawData = data.data.data.data;
        }
        if (!Array.isArray(rawData)) {
          return [];
        }
        return rawData
          .map((servicio: any) => ({
            ...servicio,
            // Asegurar que siempre tenga id_servicio (el API devuelve "id")
            id_servicio: servicio.id_servicio || servicio.id
          }));
      }
      return [];
    }
  });

  const getServicios = useCallback(
    async (includeAllParam: boolean = includeAll) => {
      if (includeAllParam !== includeAll) {
        setIncludeAll(includeAllParam);
        return;
      }
      // Invalidar todo el grupo SERVICIOS_QUERY_KEY para que React Query refetchee
      // incluso si el cache aún es "fresco" (staleTime no expirado)
      await queryClient.invalidateQueries({ queryKey: SERVICIOS_QUERY_KEY });
    },
    [includeAll, queryClient]
  );

  const createMutation = useMutation({
    mutationFn: async (servicioData: any) => {
      const response = await fetch('/api/servicios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(servicioData)
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      return data;
    },
    onSuccess: () => {
      getServicios(includeAll);
      window.dispatchEvent(new CustomEvent('servicesChanged'));
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string | number; data: any }) => {
      const response = await fetch(`/api/servicios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      return result;
    },
    onSuccess: () => {
      getServicios(includeAll);
      window.dispatchEvent(new CustomEvent('servicesChanged'));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string | number) => {
      const response = await fetch(`/api/servicios/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      return data;
    },
    onSuccess: () => {
      getServicios(includeAll);
      window.dispatchEvent(new CustomEvent('servicesChanged'));
    }
  });

  // Optimistic Mutation for PATCH (status changes)
  const patchMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string | number; data: any }) => {
      const normalizedId = String(id ?? '').trim();
      if (!normalizedId) {
        throw new Error('ID de servicio inválido');
      }

      const response = await fetch(`/api/servicios/${normalizedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      return result;
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: SERVICIOS_QUERY_KEY });
      const previousServicios = queryClient.getQueryData<ServicioWithDetails[]>(serviciosQueryKey);

      if (previousServicios) {
        queryClient.setQueryData(serviciosQueryKey, (old: ServicioWithDetails[] | undefined) =>
          old?.map((s: ServicioWithDetails) =>
            String(s.id_servicio) === String(id) ? { ...s, ...data } : s
          )
        );
      }
      return { previousServicios };
    },
    onError: (err, variables, context) => {
      if (context?.previousServicios) {
        queryClient.setQueryData(serviciosQueryKey, context.previousServicios);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: SERVICIOS_QUERY_KEY });
    }
  });

  useEffect(() => {
    const handleServiceUpdate = () => {
      getServicios(includeAll);
    };
    window.addEventListener('updateServiceRequests', handleServiceUpdate);
    window.addEventListener('serviceStatusChanged', handleServiceUpdate);
    window.addEventListener('servicesChanged', handleServiceUpdate);
    return () => {
      window.removeEventListener('updateServiceRequests', handleServiceUpdate);
      window.removeEventListener('serviceStatusChanged', handleServiceUpdate);
      window.removeEventListener('servicesChanged', handleServiceUpdate);
    };
  }, [getServicios, includeAll]);

  useSharedSSE('/api/notifications/sse', payload => {
    const shouldRefresh =
      payload?.type === 'service_changed' ||
      payload?.type === 'timers_updated' ||
      (payload?.type === 'updateSales' && payload?.data?.type === 'servicio') ||
      (payload?.type === 'timer_ended_event' && payload?.data?.type === 'servicio');

    if (!shouldRefresh) return;

    getServicios(includeAll);
    window.dispatchEvent(new CustomEvent('servicesChanged'));
  });

  return {
    servicios,
    loading:
      fetchLoading ||
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending ||
      patchMutation.isPending,
    error:
      fetchError ||
      (createMutation.error as any)?.message ||
      (updateMutation.error as any)?.message ||
      (deleteMutation.error as any)?.message ||
      (patchMutation.error as any)?.message,
    getServicios,
    createServicio: createMutation.mutateAsync,
    updateServicio: (id: string | number, data: any) => updateMutation.mutateAsync({ id, data }),
    deleteServicio: (id: string | number) => deleteMutation.mutateAsync(id),
    patchServicio: (id: string | number, data: any) => patchMutation.mutateAsync({ id, data }),
    includeAll,
    removeServicioFromState: (id: string | number) => {
      if (setServicios) {
        setServicios((prev: ServicioWithDetails[] | undefined) =>
          (prev || []).filter((s: ServicioWithDetails) => String(s.id_servicio) !== String(id))
        );
      }
    }
  };
}

// Hook para obtener TODOS los servicios (sin filtro por estado) para estadísticas
export function useAllServicios() {
  const queryClient = useQueryClient();
  const endpoint = '/api/servicios';
  const allQueryKey = useMemo(() => [...SERVICIOS_QUERY_KEY, 'all'] as const, []);

  const {
    data: servicios,
    isLoading,
    error
  } = useGenericFetch<ServicioWithDetails>(endpoint, {
    initialFetch: true,
    queryKey: allQueryKey,
    staleTime: 5000,
    transform: data => {
      if (data.success && data.data) {
        let rawData = data.data;
        if (data.data.data) {
          rawData = data.data.data;
        }
        if (!Array.isArray(rawData)) return [];

        return rawData.map((servicio: any) => ({
          ...servicio,
          id_servicio: servicio.id_servicio || servicio.id
        }));
      }
      return [];
    }
  });

  const getAllServicios = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: SERVICIOS_QUERY_KEY });
  }, [queryClient]);

  useEffect(() => {
    const handleServicesChanged = () => {
      getAllServicios();
    };

    window.addEventListener('servicesChanged', handleServicesChanged);

    return () => {
      window.removeEventListener('servicesChanged', handleServicesChanged);
    };
  }, [getAllServicios]);

  useSharedSSE('/api/notifications/sse', payload => {
    const shouldRefresh =
      payload?.type === 'service_changed' ||
      payload?.type === 'timers_updated' ||
      (payload?.type === 'updateSales' && payload?.data?.type === 'servicio') ||
      (payload?.type === 'timer_ended_event' && payload?.data?.type === 'servicio');

    if (!shouldRefresh) return;

    getAllServicios();
  });

  return {
    servicios: servicios || [],
    loading: isLoading,
    error,
    getAllServicios
  };
}

