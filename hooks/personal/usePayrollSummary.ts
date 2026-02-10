'use client';

import { useMemo } from 'react';
import { AsistenciaResumen } from '@/types/asistencia';
import { useGenericFetch } from '../shared/useGenericFetch';

export default function usePayrollSummary(month?: number, year?: number) {
  // Construir URL con parámetros de consulta
  const endpoint = useMemo(() => {
    let url = '/api/asistencias?resumen=true';
    if (month !== undefined) {
      url += `&month=${month}`;
    }
    if (year !== undefined) {
      url += `&year=${year}`;
    }
    return url;
  }, [month, year]);

  const {
    data,
    isLoading,
    error,
  } = useGenericFetch<AsistenciaResumen>(endpoint, {
    initialFetch: true,
    transform: (result) => result.data || [],
  });

  const totals = useMemo(() => {
    if (!data || data.length === 0) {
      return { sueldo: 0, descuento: 0, total: 0 };
    }
    // Calcular totales desde los datos
    return data.reduce(
      (acc, item: any) => ({
        sueldo: acc.sueldo + (item.sueldo || 0),
        descuento: acc.descuento + (item.descuento || 0),
        total: acc.total + (item.total || 0),
      }),
      { sueldo: 0, descuento: 0, total: 0 }
    );
  }, [data]);

  return {
    data,
    totals,
    isLoading,
    error
  };
}
