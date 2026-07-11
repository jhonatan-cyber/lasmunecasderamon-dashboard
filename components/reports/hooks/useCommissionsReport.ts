import { useEffect, useMemo, useReducer, useCallback } from 'react';
import logger from '@/lib/utils/logger';

interface CommissionData {
  id_usuario: number | string | null;
  nombre: string;
  apellido: string;
  nombre_completo: string;
  total_ventas: number;
  total_servicios: number;
  total_ventas_monto: number;
  total_servicios_monto: number;
  total_comisiones: number;
  promedio_por_venta: number;
  promedio_por_servicio: number;
  dias_trabajados: number;
  promedio_diario: number;
}

interface Statistics {
  total_anfitrionas: number;
  total_ventas_general: number;
  total_servicios_general: number;
  total_comisiones_general: number;
  promedio_venta_general: number;
  promedio_servicio_general: number;
  promedio_comision_por_anfitriona: number;
  total_ventas_count: number;
  total_servicios_count: number;
}

interface TopPerformer {
  id_usuario: number;
  nombre_completo: string;
  total_comisiones: number;
  total_ventas: number;
  total_servicios: number;
  total_ventas_count: number;
  total_servicios_count: number;
  promedio_por_venta: number;
  promedio_por_servicio: number;
}

interface DailyCommission {
  dia_semana: string;
  dia_espanol: string;
  total_ventas: number;
  total_servicios: number;
  total_ventas_monto: number;
  total_servicios_monto: number;
  total_comisiones: number;
  promedio_comision: number;
}

interface CommissionResponse {
  period: string;
  startDate: string | null;
  endDate: string | null;
  commissions: CommissionData[];
  statistics: Statistics;
  topPerformers: TopPerformer[];
  dailyCommissions: DailyCommission[];
}

type ReportState = {
  data: CommissionResponse | null;
  loading: boolean;
  error: string | null;
  period: string;
  startDate: string;
  endDate: string;
  tablePage: number;
};

type ReportAction =
  | { type: 'SET_PERIOD'; payload: string }
  | { type: 'SET_START_DATE'; payload: string }
  | { type: 'SET_END_DATE'; payload: string }
  | { type: 'SET_TABLE_PAGE'; payload: number }
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: CommissionResponse }
  | { type: 'FETCH_ERROR'; payload: string };

const initialReportState: ReportState = {
  data: null,
  loading: true,
  error: null,
  period: 'current_month',
  startDate: '',
  endDate: '',
  tablePage: 0
};

function reportReducer(state: ReportState, action: ReportAction): ReportState {
  switch (action.type) {
    case 'SET_PERIOD':
      return { ...state, period: action.payload, tablePage: 0 };
    case 'SET_START_DATE':
      return { ...state, startDate: action.payload, tablePage: 0 };
    case 'SET_END_DATE':
      return { ...state, endDate: action.payload, tablePage: 0 };
    case 'SET_TABLE_PAGE':
      return { ...state, tablePage: action.payload };
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, data: action.payload, error: null };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
}

const ITEMS_PER_PAGE = 5;

export function useCommissionsReport() {
  const [state, dispatch] = useReducer(reportReducer, initialReportState);
  const { data, loading, error, tablePage, period, startDate, endDate } = state;

  const fetchData = useCallback(async () => {
    dispatch({ type: 'FETCH_START' });
    try {
      const params = new URLSearchParams();
      params.append('period', period);
      if (period === 'custom' && startDate && endDate) {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }
      const res = await fetch(`/api/reports/commissions?${params.toString()}`);
      if (!res.ok) throw new Error('Error al cargar datos');
      const response: CommissionResponse = await res.json();
      dispatch({ type: 'FETCH_SUCCESS', payload: response });
    } catch (err: any) {
      logger.captureException(err, { context: 'useCommissionsReport:fetchData' });
      dispatch({ type: 'FETCH_ERROR', payload: err.message });
    }
  }, [period, startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = useMemo(() => {
    if (!data?.commissions) return 0;
    return Math.ceil(data.commissions.length / ITEMS_PER_PAGE);
  }, [data]);

  const topPerformerChartData = useMemo(() => {
    if (!data?.topPerformers) return [];
    return data.topPerformers.map(p => ({
      ...p,
      shortName: p.nombre_completo.split(' ').slice(0, 2).join(' ')
    }));
  }, [data]);

  const dailyChartData = useMemo(() => {
    if (!data?.dailyCommissions) return [];
    return data.dailyCommissions.map(d => ({
      ...d,
      diaCorto: d.dia_espanol.substring(0, 3)
    }));
  }, [data]);

  return {
    period,
    startDate,
    endDate,
    data,
    loading,
    error,
    tablePage,
    totalPages,
    setPeriod: (p: string) => dispatch({ type: 'SET_PERIOD', payload: p }),
    setStartDate: (d: string) => dispatch({ type: 'SET_START_DATE', payload: d }),
    setEndDate: (d: string) => dispatch({ type: 'SET_END_DATE', payload: d }),
    setTablePage: (page: number) => dispatch({ type: 'SET_TABLE_PAGE', payload: page }),
    fetchData,
    topPerformerChartData,
    dailyChartData,
    itemsPerPage: ITEMS_PER_PAGE
  };
}
export type { CommissionData, Statistics, TopPerformer, DailyCommission, CommissionResponse };
