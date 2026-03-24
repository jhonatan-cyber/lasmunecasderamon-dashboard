/* eslint-disable */
import { useState, useEffect, useCallback } from 'react';
import { useGenericFetch } from '../shared/useGenericFetch';
import { Gratificacion, CreateGratificacionRequest, GratificacionDetail } from '@/types/gratificacion';

export interface UpdateGratificacionRequest {
  id: string | number;
  monto: number;
  descripcion: string;
}

export const useGratificaciones = () => {
  const { data: gratificaciones, isLoading: loading, error, refetch: getGratificaciones } = useGenericFetch<Gratificacion>(
    '/api/gratificaciones',
    {
      transform: (result) => Array.isArray(result) ? result : []
    }
  );

  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [gratificacionesDetails, setGratificacionesDetails] = useState<GratificacionDetail[]>([]);

  const createGratificacion = useCallback(async (gratificacionData: CreateGratificacionRequest) => {
    try {
      const response = await fetch('/api/gratificaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gratificacionData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear la gratificación');
      }

      const result = await response.json();
      await getGratificaciones();
      return result;
    } catch (err) {
      throw err;
    }
  }, [getGratificaciones]);

  const updateGratificacion = useCallback(async (gratificacionData: UpdateGratificacionRequest) => {
    try {
      const response = await fetch('/api/gratificaciones', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gratificacionData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar la gratificación');
      }

      const result = await response.json();
      await getGratificaciones();
      return result;
    } catch (err) {
      throw err;
    }
  }, [getGratificaciones]);

  const deleteGratificacion = useCallback(async (id: string | number) => {
    try {
      const response = await fetch('/api/gratificaciones', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al eliminar la gratificación');
      }

      const result = await response.json();
      await getGratificaciones();
      return result;
    } catch (err) {
      throw err;
    }
  }, [getGratificaciones]);

  const getGratificacionesDetails = useCallback(async (userId: number) => {
    try {
      setDetailsLoading(true);
      setDetailsError(null);

      const response = await fetch(`/api/gratificaciones?userId=${userId}`);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error al obtener detalles: ${response.status} ${errorText}`);
      }

      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        const processedDetails = result.data.map((detail: any) => ({
          fecha_crea: detail.fecha_crea,
          fecha_mod: detail.fecha_mod,
          usuario: String(detail.usuario),
          monto: Number(detail.monto),
          descripcion: String(detail.descripcion),
          estado: Number(detail.estado)
        }));

        setGratificacionesDetails(processedDetails);
        return processedDetails;
      } else {
        throw new Error('Formato de respuesta inválido');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setDetailsError(errorMessage);
      throw err;
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  return {
    gratificaciones: gratificaciones || [],
    loading,
    error,
    getGratificaciones,
    createGratificacion,
    updateGratificacion,
    deleteGratificacion,
    getGratificacionesDetails,
    detailsLoading,
    detailsError,
    gratificacionesDetails
  };
};

