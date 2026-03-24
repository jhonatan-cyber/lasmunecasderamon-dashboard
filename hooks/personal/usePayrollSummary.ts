'use client';

import { useMemo } from 'react';
import { AsistenciaResumen } from '@/types/asistencia';
import { useGenericFetch } from '../shared/useGenericFetch';

export default function usePayrollSummary(month?: number, year?: number) {
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
    return data.reduce(
      (acc, item: AsistenciaResumen) => ({
        sueldo: acc.sueldo + Number(item.sueldo_total || 0),
        descuento: acc.descuento + Number(item.descuento_total || 0),
        total: acc.total + Number(item.total_final || 0),
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

