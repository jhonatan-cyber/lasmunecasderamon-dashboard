import { useState, useEffect, useCallback, useMemo } from 'react';
import { ServicioWithDetails } from '@/types/servicio';
import { useGenericFetch } from '../shared/useGenericFetch';

export function useServicios() {
  const [mutationLoading, setMutationLoading] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
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
        const serviciosFiltrados = data.data.filter((servicio: any) => {
          return !servicio.es_temporal && !servicio.servicio_original_id;
        });
        return serviciosFiltrados;
      }
      return [];
    }
  });

  const loading = fetchLoading || mutationLoading;
  const error = fetchError || mutationError;

  const getServicios = useCallback(
    async (includeAllParam: boolean = true) => {
      setIncludeAll(includeAllParam);
      await refetch();
    },
    [refetch]
  );

  const createServicio = useCallback(
    async (servicioData: any) => {
      setMutationLoading(true);
      setMutationError(null);
      try {
        const response = await fetch('/api/servicios', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(servicioData)
        });

        const data = await response.json();

        if (data.success) {
          await getServicios(true);
          return { success: true, data: data.data };
        } else {
          setMutationError(data.message);
          return { success: false, message: data.message };
        }
      } catch (err) {
        setMutationError('Error de conexión');
        return { success: false, message: 'Error de conexión' };
      } finally {
        setMutationLoading(false);
      }
    },
    [getServicios]
  );

  const getServicioById = useCallback(async (id: number) => {
    try {
      const response = await fetch(`/api/servicios/${id}`);
      const data = await response.json();

      if (data.success) {
        return { success: true, data: data.data };
      } else {
        return { success: false, message: data.message };
      }
    } catch (err) {
      return { success: false, message: 'Error de conexión' };
    }
  }, []);

  const updateServicio = useCallback(
    async (id: number, servicioData: any) => {
      setMutationLoading(true);
      setMutationError(null);
      try {
        const response = await fetch(`/api/servicios/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(servicioData)
        });

        const data = await response.json();

        if (data.success) {
          await getServicios(true);
          return { success: true, data: data.data };
        } else {
          setMutationError(data.message);
          return { success: false, message: data.message };
        }
      } catch (err) {
        setMutationError('Error de conexión');
        return { success: false, message: 'Error de conexión' };
      } finally {
        setMutationLoading(false);
      }
    },
    [getServicios]
  );

  const deleteServicio = useCallback(
    async (id: number) => {
      setMutationLoading(true);
      setMutationError(null);
      try {
        const response = await fetch(`/api/servicios/${id}`, {
          method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
          await getServicios(true);
          return { success: true };
        } else {
          setMutationError(data.message);
          return { success: false, message: data.message };
        }
      } catch (err) {
        setMutationError('Error de conexión');
        return { success: false, message: 'Error de conexión' };
      } finally {
        setMutationLoading(false);
      }
    },
    [getServicios]
  );

  const removeServicioFromState = useCallback(
    (id: number) => {
      setServicios(prev => prev.filter(servicio => servicio.id_servicio !== id));
    },
    [setServicios]
  );

  useEffect(() => {
    const handleServiceUpdate = () => {
      getServicios(true);
    };

    window.addEventListener('updateServiceRequests', handleServiceUpdate);
    window.addEventListener('serviceStatusChanged', handleServiceUpdate);

    return () => {
      window.removeEventListener('updateServiceRequests', handleServiceUpdate);
      window.removeEventListener('serviceStatusChanged', handleServiceUpdate);
    };
  }, [getServicios]);

  return {
    servicios,
    loading,
    error,
    getServicios,
    createServicio,
    getServicioById,
    updateServicio,
    deleteServicio,
    removeServicioFromState
  };
}
