'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import logger from '@/lib/utils/logger';
import { formatShortDateEs } from '@/lib/utils/calendarUtils';

export interface SalesData {
  totalVentas: number;
  cantidadVentas: number;
  promedioVenta: number;
  totalPropinas: number;
  ventasPorMetodo: {
    efectivo: number;
    tarjeta: number;
    transferencia: number;
  };
  ventasPorDia: Array<{
    fecha: string;
    ventas: number;
    cantidad: number;
    propinas: number;
  }>;
}

export type SalesPeriod = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export interface PaymentItem {
  label: string;
  value: number;
  color: string;
}

export interface BarDataItem {
  fecha: string;
  ventas: number;
  cantidad: number;
  propinas: number;
  fechaCorta: string;
  diaNum: string;
  label: string;
}

export interface UseSalesReportReturn {
  // State
  period: SalesPeriod;
  startDate: string;
  endDate: string;
  salesData: SalesData | null;
  loading: boolean;

  // Computed
  pieData: Array<{ name: string; value: number }>;
  barData: BarDataItem[];
  paymentItems: PaymentItem[];
  paymentTotal: number;

  // Actions
  setPeriod: (period: SalesPeriod) => void;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  exportReport: () => void;
}

export function useSalesReport(): UseSalesReportReturn {
  const [period, setPeriod] = useState<SalesPeriod>('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSalesData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (period === 'custom') {
        params.append('period', 'custom');
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      } else {
        params.append('period', period);
      }

      const response = await fetch(`/api/reports/sales?${params}`);
      const data = await response.json();

      if (data.success) {
        setSalesData(data.data);
      }
    } catch (error) {
      logger.captureException(error, { context: 'SalesReport:unknown' });
    } finally {
      setLoading(false);
    }
  }, [period, startDate, endDate]);

  useEffect(() => {
    fetchSalesData();
  }, [fetchSalesData]);

  const pieData = useMemo(() => {
    if (!salesData?.ventasPorMetodo) return [];
    return [
      { name: 'Efectivo', value: salesData.ventasPorMetodo.efectivo },
      { name: 'Tarjeta', value: salesData.ventasPorMetodo.tarjeta },
      { name: 'Transferencia', value: salesData.ventasPorMetodo.transferencia }
    ].filter(item => item.value > 0);
  }, [salesData]);

  const barData = useMemo(() => {
    if (!salesData?.ventasPorDia) return [];
    return salesData.ventasPorDia.map(dia => {
      const fecha = new Date(dia.fecha);
      return {
        ...dia,
        fechaCorta: formatShortDateEs(fecha),
        diaNum: fecha.getDate().toString().padStart(2, '0'),
        label: formatShortDateEs(fecha)
      };
    });
  }, [salesData]);

  const paymentItems = useMemo(() => {
    if (!salesData?.ventasPorMetodo) return [];

    return [
      { label: 'Efectivo', value: salesData.ventasPorMetodo.efectivo, color: '#10B981' },
      { label: 'Tarjeta', value: salesData.ventasPorMetodo.tarjeta, color: '#3B82F6' },
      { label: 'Transferencia', value: salesData.ventasPorMetodo.transferencia, color: '#8B5CF6' }
    ].filter(item => item.value > 0);
  }, [salesData]);

  const paymentTotal = useMemo(
    () => paymentItems.reduce((sum, item) => sum + item.value, 0),
    [paymentItems]
  );

  const exportReport = () => {
    logger.info('Exportando reporte...');
  };

  return {
    period,
    startDate,
    endDate,
    salesData,
    loading,
    pieData,
    barData,
    paymentItems,
    paymentTotal,
    setPeriod,
    setStartDate,
    setEndDate,
    exportReport
  };
}
