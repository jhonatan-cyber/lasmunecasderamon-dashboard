'use client';

import { useEffect, useMemo, useReducer, useCallback } from 'react';
import logger from '@/lib/utils/logger';

interface ReportResponse {
  success: boolean;
  data: {
    period: string;
    range: { start: string | null; end: string | null };
    summary: {
      cajas: number;
      apertura_total: number;
      cierre_total: number;
      diferencia_total: number;
      ventas: number;
      servicios: number;
      efectivo: number;
      tarjeta: number;
      transferencia: number;
      propina: number;
      comision: number;
      iva: number;
      devoluciones: number;
    };
    cajas: Array<{
      id_caja: number;
      fecha_apertura: string;
      fecha_cierre: string | null;
      monto_apertura: number;
      monto_cierre: number | null;
      estado: number;
      venta: number;
      servicio: number;
      efectivo: number;
      tarjeta: number;
      transferencia: number;
      propina: number;
      comision: number;
      devoluciones: number;
      turno: 'Día' | 'Noche';
      diferencia: number;
    }>;
    movimientos: {
      ingresos: { total: number; detalle: Array<{ tipo: string; monto: number }> };
      egresos: { total: number; detalle: Array<{ tipo: string; monto: number }> };
    };
    flujoEfectivo: { entradas: number; salidas: number; neto: number };
  };
}

type ReportState = {
  period: string;
  startDate: string;
  endDate: string;
  data: ReportResponse['data'] | null;
  loading: boolean;
};

type ReportAction =
  | { type: 'SET_PERIOD'; payload: string }
  | { type: 'SET_START_DATE'; payload: string }
  | { type: 'SET_END_DATE'; payload: string }
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: ReportResponse['data'] }
  | { type: 'FETCH_ERROR' };

const initialReportState: ReportState = {
  period: 'today',
  startDate: '',
  endDate: '',
  data: null,
  loading: true
};

function reportReducer(state: ReportState, action: ReportAction): ReportState {
  switch (action.type) {
    case 'SET_PERIOD':
      return { ...state, period: action.payload };
    case 'SET_START_DATE':
      return { ...state, startDate: action.payload };
    case 'SET_END_DATE':
      return { ...state, endDate: action.payload };
    case 'FETCH_START':
      return { ...state, loading: true };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, data: action.payload };
    case 'FETCH_ERROR':
      return { ...state, loading: false };
    default:
      return state;
  }
}

export function useCashRegisterReport() {
  const [state, dispatch] = useReducer(reportReducer, initialReportState);
  const { data, loading, period, startDate, endDate } = state;

  const fetchData = useCallback(async () => {
    dispatch({ type: 'FETCH_START' });
    try {
      const params = new URLSearchParams();
      if (period === 'custom') {
        params.append('period', 'custom');
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      } else {
        params.append('period', period);
      }
      const res = await fetch(`/api/reports/cash-register?${params}`);
      const json: ReportResponse = await res.json();
      if (json.success) {
        dispatch({ type: 'FETCH_SUCCESS', payload: json.data });
      } else {
        dispatch({ type: 'FETCH_ERROR' });
      }
    } catch (e) {
      logger.captureException(e, { context: 'useCashRegisterReport:fetchData' });
      dispatch({ type: 'FETCH_ERROR' });
    }
  }, [period, startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const paymentPieData = useMemo(() => {
    if (!data?.summary) return [];
    return [
      { name: 'Efectivo', value: parseFloat(String(data.summary.efectivo)) || 0 },
      { name: 'Tarjeta', value: parseFloat(String(data.summary.tarjeta)) || 0 },
      { name: 'Transferencia', value: parseFloat(String(data.summary.transferencia)) || 0 }
    ].filter(d => d.value > 0);
  }, [data]);

  const flowBarData = useMemo(() => {
    if (!data?.flujoEfectivo) return [];
    return [
      {
        name: 'Flujo de Efectivo',
        Entradas: parseFloat(String(data.flujoEfectivo.entradas)) || 0,
        Salidas: parseFloat(String(data.flujoEfectivo.salidas)) || 0,
        Neto: parseFloat(String(data.flujoEfectivo.neto)) || 0
      }
    ];
  }, [data]);

  const movBarData = useMemo(() => {
    if (!data?.movimientos) return [];
    return [
      {
        name: 'Ingresos',
        valor: parseFloat(String(data.movimientos.ingresos.total)) || 0,
        fill: '#10B981'
      },
      {
        name: 'Egresos',
        valor: parseFloat(String(data.movimientos.egresos.total)) || 0,
        fill: '#EF4444'
      }
    ];
  }, [data]);

  const cajasBarData = useMemo(() => {
    if (!data?.cajas) return [];
    return data.cajas.map(c => ({
      name: `#${c.id_caja}`,
      turno: c.turno,
      Apertura: parseFloat(String(c.monto_apertura)) || 0,
      Cierre: parseFloat(String(c.monto_cierre)) || 0,
      Diferencia: parseFloat(String(c.diferencia)) || 0
    }));
  }, [data]);

  return {
    period,
    startDate,
    endDate,
    data,
    loading,
    setPeriod: (p: string) => dispatch({ type: 'SET_PERIOD', payload: p }),
    setStartDate: (d: string) => dispatch({ type: 'SET_START_DATE', payload: d }),
    setEndDate: (d: string) => dispatch({ type: 'SET_END_DATE', payload: d }),
    fetchData,
    paymentPieData,
    flowBarData,
    movBarData,
    cajasBarData
  };
}
