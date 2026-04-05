  
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { ServicioWithDetails } from '@/types/servicio';
import { useGenericFetch } from '../shared/useGenericFetch';

export function useServicios() {
  const queryClient = useQueryClient();
  const [includeAll, setIncludeAll] = useState(false); // Iniciar con false = servicios activos (estado 2,3,4)
  const endpoint = useMemo(() => {
    const ep = includeAll ? '/api/servicios?all=true' : '/api/servicios?all=false';
    console.log('[useServicios] endpoint:', ep);
    return ep;
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
      console.log('[useServicios] raw response:', JSON.stringify(data).substring(0, 500));
      if (data.success && data.data) {
        // La respuesta puede ser { data: [...] } o [...] directamente
        let rawData = data.data;
        if (data.data.data) {
          rawData = data.data.data;
        } else if (data.data.data?.data) {
          rawData = data.data.data.data;
        }
        console.log('[useServicios] rawData is array?', Array.isArray(rawData), 'length:', rawData?.length);
        if (!Array.isArray(rawData)) {
          console.log('[useServicios] rawData structure:', typeof rawData, rawData);
          return [];
        }
        const filtered = rawData.map((servicio: any) => ({
          ...servicio,
          // Asegurar que siempre tenga id_servicio (el API devuelve "id")
          id_servicio: servicio.id_servicio || servicio.id
        })).filter((servicio: any) => {
          return !servicio.es_temporal && !servicio.servicio_original_id;
        });
        console.log('[useServicios] filtered servicios:', filtered.length);
        return filtered;
      }
      console.log('[useServicios] data.success was false or no data:', data);
      return [];
    }
  });

  console.log('[useServicios] returning servicios:', servicios?.length || 0, 'loading:', fetchLoading);

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

// Hook para obtener TODOS los servicios (sin filtro por estado) para estadísticas
export function useAllServicios() {
  const endpoint = '/api/servicios';
  
  const {
    data: servicios,
    isLoading,
    error,
    refetch
  } = useGenericFetch<ServicioWithDetails>(endpoint, {
    initialFetch: true,
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
    await refetch();
  }, [refetch]);

  return {
    servicios: servicios || [],
    loading: isLoading,
    error,
    getAllServicios
  };
}

