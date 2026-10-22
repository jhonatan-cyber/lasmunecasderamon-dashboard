'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useGenericFetch } from '../shared/useGenericFetch';
import { Overtime, CreateOvertimeRequest } from '@/types/overtime';

export interface OvertimeDetail {
  fecha_crea: string;
  fecha_mod: string | null;
  usuario: string;
  hora: number;
  monto: number;
  total: number;
  estado: number;
}

export const useOvertime = () => {
  const {
    data: overtime,
    isLoading: loading,
    error,
    refetch: getOvertime
  } = useGenericFetch<Overtime>('/api/overtime', {
    transform: result => (result.success && Array.isArray(result.data) ? result.data : [])
  });

  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [overtimeDetails, setOvertimeDetails] = useState<OvertimeDetail[]>([]);

  const detailRequest = useRef<AbortController | null>(null);
  useEffect(() => () => detailRequest.current?.abort(), []);

  const createOvertime = useCallback(
    async (overtimeData: CreateOvertimeRequest) => {
      try {
        const response = await fetch('/api/overtime', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(overtimeData)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message ||
              errorData.error?.message ||
              errorData.error ||
              'Error al crear la hora extra'
          );
        }

        const result = await response.json();
        if (result?.success === false)
          throw new Error(
            result.message || result.error?.message || result.error || 'Solicitud rechazada'
          );
        await getOvertime();
        return result;
      } catch (err) {
        throw err;
      }
    },
    [getOvertime]
  );

  const getOvertimeDetails = useCallback(async (userId: string) => {
    detailRequest.current?.abort();
    const controller = new AbortController();
    detailRequest.current = controller;
    setOvertimeDetails([]);
    try {
      setDetailsLoading(true);
      setDetailsError(null);

      const response = await fetch(`/api/overtime?userId=${encodeURIComponent(String(userId))}`, {
        signal: controller.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error al obtener detalles: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      if (controller.signal.aborted) return [];

      if (result.success && Array.isArray(result.data)) {
        const processedDetails = result.data.map((detail: any) => ({
          fecha_crea: detail.fecha_crea,
          fecha_mod: detail.fecha_mod,
          usuario: String(detail.usuario),
          hora: Number(detail.hora),
          monto: Number(detail.monto),
          total: Number(detail.total),
          estado: Number(detail.estado)
        }));

        setOvertimeDetails(processedDetails);
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
    overtime: overtime || [],
    loading,
    error,
    getOvertime,
    createOvertime,
    getOvertimeDetails,
    detailsLoading,
    detailsError,
    overtimeDetails
  };
};
