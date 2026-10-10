'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useGenericFetch } from '../shared/useGenericFetch';
import {
  Gratificacion,
  CreateGratificacionRequest,
  GratificacionDetail
} from '@/types/gratificacion';

export interface UpdateGratificacionRequest {
  id: string | number;
  monto: number;
  descripcion: string;
}

export const useGratificaciones = () => {
  const {
    data: gratificaciones,
    isLoading: loading,
    error,
    refetch: getGratificaciones
  } = useGenericFetch<Gratificacion>('/api/gratificaciones', {
    transform: result => (Array.isArray(result) ? result : [])
  });

  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [gratificacionesDetails, setGratificacionesDetails] = useState<GratificacionDetail[]>([]);

  const detailRequest = useRef<AbortController | null>(null);
  useEffect(() => () => detailRequest.current?.abort(), []);

  const createGratificacion = useCallback(
    async (gratificacionData: CreateGratificacionRequest) => {
      try {
        const response = await fetch('/api/gratificaciones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(gratificacionData)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message ||
              errorData.error?.message ||
              errorData.error ||
              'Error al crear la gratificación'
          );
        }

        const result = await response.json();
        if (result?.success === false)
          throw new Error(
            result.message || result.error?.message || result.error || 'Solicitud rechazada'
          );
        await getGratificaciones();
        return result;
      } catch (err) {
        throw err;
      }
    },
    [getGratificaciones]
  );

  const updateGratificacion = useCallback(
    async (gratificacionData: UpdateGratificacionRequest) => {
      try {
        const response = await fetch('/api/gratificaciones', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(gratificacionData)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message ||
              errorData.error?.message ||
              errorData.error ||
              'Error al actualizar la gratificación'
          );
        }

        const result = await response.json();
        if (result?.success === false)
          throw new Error(
            result.message || result.error?.message || result.error || 'Solicitud rechazada'
          );
        await getGratificaciones();
        return result;
      } catch (err) {
        throw err;
      }
    },
    [getGratificaciones]
  );

  const deleteGratificacion = useCallback(
    async (id: string | number) => {
      try {
        const response = await fetch('/api/gratificaciones', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message ||
              errorData.error?.message ||
              errorData.error ||
              'Error al eliminar la gratificación'
          );
        }

        const result = await response.json();
        if (result?.success === false)
          throw new Error(
            result.message || result.error?.message || result.error || 'Solicitud rechazada'
          );
        await getGratificaciones();
        return result;
      } catch (err) {
        throw err;
      }
    },
    [getGratificaciones]
  );

  const getGratificacionesDetails = useCallback(async (userId: number) => {
    detailRequest.current?.abort();
    const controller = new AbortController();
    detailRequest.current = controller;
    setGratificacionesDetails([]);
    try {
      setDetailsLoading(true);
      setDetailsError(null);

      const response = await fetch(
        `/api/gratificaciones?userId=${encodeURIComponent(String(userId))}`,
        { signal: controller.signal }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error al obtener detalles: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      if (controller.signal.aborted) return [];

      const rows = Array.isArray(result) ? result : result.success ? result.data : null;
      if (Array.isArray(rows)) {
        const processedDetails = rows.map((detail: any) => ({
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
      if (controller.signal.aborted) return [];
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setDetailsError(errorMessage);
      throw err;
    } finally {
      if (!controller.signal.aborted) setDetailsLoading(false);
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
