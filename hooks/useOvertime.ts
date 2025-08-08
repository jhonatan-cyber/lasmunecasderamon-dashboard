import { useState, useEffect } from 'react';
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
  const [overtime, setOvertime] = useState<Overtime[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getOvertime = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/overtime');

      if (!response.ok) {
        const errorText = await response.text();

        throw new Error(`Error al cargar las horas extras: ${response.status} ${errorText}`);
      }

      const data = await response.json();

      // Asegurar que data sea un array
      setOvertime(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setOvertime([]); // En caso de error, establecer array vacío
    } finally {
      setLoading(false);
    }
  };

  const createOvertime = async (overtimeData: CreateOvertimeRequest) => {
    try {
      const response = await fetch('/api/overtime', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(overtimeData)
      });

      if (!response.ok) {
        const errorData = await response.json();

        throw new Error(errorData.message || 'Error al crear la hora extra');
      }

      const result = await response.json();

      // Recargar la lista después de crear
      await getOvertime();

      return result;
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    getOvertime();
  }, []);

  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [overtimeDetails, setOvertimeDetails] = useState<OvertimeDetail[]>([]);

  const getOvertimeDetails = async (userId: number) => {
    try {
      setDetailsLoading(true);
      setDetailsError(null);

      const response = await fetch(`/api/overtime?userId=${userId}`);

      if (!response.ok) {
        const errorText = await response.text();

        throw new Error(`Error al obtener detalles: ${response.status} ${errorText}`);
      }

      const result = await response.json();

      // Verificar si la respuesta tiene el formato esperado
      if (result.success && Array.isArray(result.data)) {
        const processedDetails = result.data.map((detail: any, index: number) => {
          return {
            fecha_crea: detail.fecha_crea,
            fecha_mod: detail.fecha_mod,
            usuario: String(detail.usuario),
            hora: Number(detail.hora),
            monto: Number(detail.monto),
            total: Number(detail.total),
            estado: Number(detail.estado)
          };
        });

        setOvertimeDetails(processedDetails);
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
  };

  return {
    overtime,
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
