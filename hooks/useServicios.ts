import { useState, useEffect, useCallback } from 'react';
import { ServicioWithDetails } from '@/types/servicio';

export function useServicios() {
  const [servicios, setServicios] = useState<ServicioWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getServicios = useCallback(async (includeAll: boolean = true) => {
    try {
      setLoading(true);
      console.log('📡 Obteniendo servicios, includeAll:', includeAll);
      // Cargar todos los servicios o solo activos según el parámetro
      const url = includeAll ? '/api/servicios' : '/api/servicios?all=false';

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        console.log('✅ Servicios obtenidos:', data.data.length);
        setServicios(data.data);
      } else {
        setError(data.message || 'Error al cargar servicios');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, []);

  const createServicio = useCallback(
    async (servicioData: any) => {
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
          return { success: false, message: data.message };
        }
      } catch (err) {
        return { success: false, message: 'Error de conexión' };
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
          return { success: false, message: data.message };
        }
      } catch (err) {
        return { success: false, message: 'Error de conexión' };
      }
    },
    [getServicios]
  );

  const deleteServicio = useCallback(
    async (id: number) => {
      try {
        const response = await fetch(`/api/servicios/${id}`, {
          method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
          await getServicios(true); // Recargar todos los servicios
          return { success: true };
        } else {
          return { success: false, message: data.message };
        }
      } catch (err) {
        return { success: false, message: 'Error de conexión' };
      }
    },
    [getServicios]
  );

  const removeServicioFromState = useCallback((id: number) => {
    setServicios(prev => prev.filter(servicio => servicio.id_servicio !== id));
  }, []);

  useEffect(() => {
    // Cargar todos los servicios al inicio (incluyendo terminados)
    getServicios(true);
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
