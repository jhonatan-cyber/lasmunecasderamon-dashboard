import { useState, useEffect, useCallback, useMemo } from 'react';
import { ServicioWithDetails } from '@/types/servicio';
import { useGenericFetch } from '../shared/useGenericFetch';

export function useServicios() {
  const [mutationLoading, setMutationLoading] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [includeAll, setIncludeAll] = useState(true);

  // Construir endpoint dinámico
  const endpoint = useMemo(() => {
    return includeAll ? '/api/servicios' : '/api/servicios?all=false';
  }, [includeAll]);

  // Usar hook genérico para fetch de servicios
  const {
    data: servicios,
    isLoading: fetchLoading,
    error: fetchError,
    refetch,
    setData: setServicios
  } = useGenericFetch<ServicioWithDetails>(endpoint, {
    initialFetch: true,
    transform: (data) => {
      if (data.success) {
        console.log('✅ Servicios obtenidos:', data.data.length);
        // Filtrar servicios temporales para no mostrarlos en la lista principal
        const serviciosFiltrados = data.data.filter((servicio: any) => {
          // Excluir servicios temporales y servicios que tengan servicio_original_id (son temporales)
          return !servicio.es_temporal && !servicio.servicio_original_id;
        });
        console.log('🔍 Servicios filtrados (sin temporales):', serviciosFiltrados.length);
        return serviciosFiltrados;
      }
      return [];
    }
  });

  // Combinar loading y error states
  const loading = fetchLoading || mutationLoading;
  const error = fetchError || mutationError;

  const getServicios = useCallback(async (includeAllParam: boolean = true) => {
    console.log('📡 Obteniendo servicios, includeAll:', includeAllParam);
    setIncludeAll(includeAllParam);
    await refetch();
  }, [refetch]);

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
          await getServicios(true); // Recargar todos los servicios
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
          await getServicios(true); // Recargar todos los servicios
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
          await getServicios(true); // Recargar todos los servicios
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

  const removeServicioFromState = useCallback((id: number) => {
    setServicios(prev => prev.filter(servicio => servicio.id_servicio !== id));
  }, [setServicios]);

  // Escuchar eventos de actualización de servicios en tiempo real
  useEffect(() => {
    const handleServiceUpdate = () => {
      console.log('🔄 Recargando servicios por evento de actualización');
      getServicios(true); // Recargar todos los servicios
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
