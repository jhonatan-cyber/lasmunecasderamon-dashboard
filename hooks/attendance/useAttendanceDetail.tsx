'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import logger from '@/lib/utils/logger';
import { formatLongDateEs, formatShortTimeEs } from '@/lib/utils/calendarUtils';

export interface AsistenciaDetalle {
  id_asistencia: number;
  fecha: string;
  hora: string;
  estado: number;
  observaciones?: string;
  sueldo?: number;
  aporte?: number;
  descuento?: number;
  semanas_con_descuento?: number;
  sueldo_final?: number;
  descuento_total?: number;
  total_final?: number;
}

interface UseAttendanceDetailParams {
  isOpen: boolean;
  userId: number;
}

export function useAttendanceDetail({ isOpen, userId }: UseAttendanceDetailParams) {
  const [asistencias, setAsistencias] = useState<AsistenciaDetalle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const pageSizeOptions = [5, 10, 20, 40];

  useEffect(() => {
    const controller = new AbortController();
    setAsistencias([]);
    setError(null);
    setCurrentPage(1);
    setLoading(false);
    if (!isOpen || !userId) return () => controller.abort();
    const fetchAsistenciasDetalle = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/attendance/${userId}/detalle`, {
          signal: controller.signal
        });
        if (!response.ok) throw new Error('Error al obtener el detalle de asistencias');

        const result = await response.json();
        if (controller.signal.aborted) return;
        if (!result.success) throw new Error(result.error || 'Error al obtener el detalle');

        setAsistencias(Array.isArray(result.data) ? result.data : []);
      } catch (err) {
        if (controller.signal.aborted) return;
        logger.captureException(err, { context: 'AttendanceDetailModal:fetchDetail' });
        setError(err instanceof Error ? err.message : 'Error desconocido');
        setAsistencias([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void fetchAsistenciasDetalle();
    return () => controller.abort();
  }, [isOpen, userId]);

  const formatDate = useCallback((dateString: string) => {
    return formatLongDateEs(dateString);
  }, []);

  const formatTime = useCallback((timeString: string) => {
    if (!timeString) return 'Sin hora';
    const formatted = formatShortTimeEs(timeString);
    if (!formatted || formatted === 'Hora inválida') return 'Hora inválida';
    return formatted;
  }, []);

  const getStatusBadgeText = useCallback((estado: number) => {
    switch (estado) {
      case 1:
        return { label: 'Por Pagar', className: 'bg-yellow-100 text-yellow-800' as const };
      case 0:
        return { label: 'Pagado', className: 'bg-green-100 text-green-800' as const };
      default:
        return { label: 'Sin definir', className: 'bg-gray-100 text-gray-800' as const };
    }
  }, []);

  const totalPages = Math.ceil(asistencias.length / pageSize);
  const effectivePage = Math.min(Math.max(1, totalPages), currentPage);
  const startIndex = (effectivePage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedAsistencias = asistencias.slice(startIndex, endIndex);

  const handlePageChange = useCallback(
    (page: number) => {
      if (Number.isInteger(page) && page >= 1 && page <= Math.max(1, totalPages))
        setCurrentPage(page);
    },
    [totalPages]
  );

  const totals = useMemo(() => {
    const totalSueldos = asistencias.reduce((sum, a) => sum + (a.sueldo || 0), 0);
    const totalAportes = asistencias.reduce((sum, a) => sum + (a.aporte || 0), 0);
    const totalDescuentos = asistencias.length > 0 ? asistencias[0].descuento_total || 0 : 0;
    const totalFinal = totalSueldos - totalAportes - totalDescuentos;

    const primerRegistro = asistencias[0];
    const semanasConDescuento = primerRegistro?.semanas_con_descuento || 0;
    const montoDescuento = primerRegistro?.descuento || 0;

    return {
      totalSueldos,
      totalAportes,
      totalDescuentos,
      totalFinal,
      semanasConDescuento,
      montoDescuento
    };
  }, [asistencias]);

  return {
    asistencias,
    loading,
    error,
    currentPage: effectivePage,
    pageSize,
    pageSizeOptions,
    paginatedAsistencias,
    totalPages,
    totals,
    handlePageChange,
    setPageSize: (value: number) => {
      if (!pageSizeOptions.includes(value)) return;
      setPageSize(value);
      setCurrentPage(1);
    },
    formatDate,
    formatTime,
    getStatusBadgeText
  };
}
