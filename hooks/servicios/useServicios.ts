 
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { ServicioWithDetails } from '@/types/servicio';
import { useGenericFetch } from '../shared/useGenericFetch';

export function useServicios() {
  const queryClient = useQueryClient();
  const [includeAll, setIncludeAll] = useState(true);
  const endpoint = useMemo(() => {
    return includeAll ? '/api/servicios' : '/api/servicios?all=false';
  }, [includeAll]);

  const {
    data: servicios,
    isLoading: fetchLoading,
    error: fetchError,
    refetch,
    setData: setServicios
  } = useGenericFetch<ServicioWithDetails>(endpoint, {
    initialFetch: true,
    transform: data => {
      if (data.success) {
        return data.data.filter((servicio: any) => {
          return !servicio.es_temporal && !servicio.servicio_original_id;
        });
      }
      return [];
    }
  });

  const getServicios = useCallback(
    async (includeAllParam: boolean = true) => {
      setIncludeAll(includeAllParam);
      await refetch();
    },
    [refetch]
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
    onSuccess: () => getServicios(true)
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
    onSuccess: () => getServicios(true)
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string | number) => {
      const response = await fetch(`/api/servicios/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      return data;
    },
    onSuccess: () => getServicios(true)
  });

  // Optimistic Mutation for PATCH (status changes)
  const patchMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string | number; data: any }) => {
      const response = await fetch(`/api/servicios/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      return result;
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: [endpoint] });
      const previousServicios = queryClient.getQueryData<ServicioWithDetails[]>([endpoint]);

      if (previousServicios) {
        queryClient.setQueryData([endpoint], (old: ServicioWithDetails[] | undefined) =>
          old?.map((s: ServicioWithDetails) => String(s.id_servicio) === String(id) ? { ...s, ...data } : s)
        );
      }
      return { previousServicios };
    },
    onError: (err, variables, context) => {
      if (context?.previousServicios) {
        queryClient.setQueryData([endpoint], context.previousServicios);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint] });
    }
  });

  useEffect(() => {
    const handleServiceUpdate = () => { getServicios(true); };
    window.addEventListener('updateServiceRequests', handleServiceUpdate);
    window.addEventListener('serviceStatusChanged', handleServiceUpdate);
    return () => {
      window.removeEventListener('updateServiceRequests', handleServiceUpdate);
      window.removeEventListener('serviceStatusChanged', handleServiceUpdate);
    };
  }, [getServicios]);

  return {
    servicios,
    loading: fetchLoading || createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || patchMutation.isPending,
    error: fetchError || (createMutation.error as any)?.message || (updateMutation.error as any)?.message || (deleteMutation.error as any)?.message || (patchMutation.error as any)?.message,
    getServicios,
    createServicio: createMutation.mutateAsync,
    updateServicio: (id: string | number, data: any) => updateMutation.mutateAsync({ id, data }),
    deleteServicio: (id: string | number) => deleteMutation.mutateAsync(id),
    patchServicio: (id: string | number, data: any) => patchMutation.mutateAsync({ id, data }),
    removeServicioFromState: (id: string | number) => {
      if (setServicios) {
        setServicios((prev: ServicioWithDetails[] | undefined) => 
          (prev || []).filter((s: ServicioWithDetails) => String(s.id_servicio) !== String(id))
        );
      }
    }
  };
}

