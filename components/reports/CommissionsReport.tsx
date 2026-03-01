'use client';

import { useState, useEffect, useMemo, useReducer } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Users,
  DollarSign,
  Award,
  CalendarDays,
  BarChart3,
  UserCheck,
  Target,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { formatCurrencyNoDecimals } from "@/lib/formatters";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ComposedChart,
  Line,
  Legend,
} from 'recharts';

interface CommissionData {
  id_usuario: number;
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

// REDUCER FOR STATE MANAGEMENT
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
  tablePage: 0,
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

const TOP_PERFORMER_COLORS = ['#F59E0B', '#9CA3AF', '#D97706', '#6366F1', '#EC4899'];

const formatNumber = (amount: number) => {
  if (!amount || isNaN(amount) || amount === Infinity || amount === -Infinity) {
    return '0';
  }
  const roundedAmount = Math.round(amount);
  return roundedAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const formatCompact = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
  return `$${value}`;
};

interface PerformerTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: TopPerformer & { shortName: string } }>;
}

const PerformerTooltip = ({ active, payload }: PerformerTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-gray-900/95 backdrop-blur-md border border-gray-700/50 rounded-xl px-4 py-3 shadow-2xl max-w-[220px]">
        <p className="text-white font-semibold text-sm mb-2">{data.nombre_completo}</p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-gray-300 text-xs">Comisiones:</span>
            <span className="text-emerald-300 font-bold text-sm">$ {formatNumber(data.total_comisiones)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-gray-300 text-xs">Ventas:</span>
            <span className="text-blue-300 text-sm">{data.total_ventas_count}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-gray-300 text-xs">Servicios:</span>
            <span className="text-purple-300 text-sm">{data.total_servicios_count}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

interface DailyTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; name: string; color: string; payload: DailyCommission & { diaCorto: string } }>;
}

const DailyTooltip = ({ active, payload }: DailyTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-gray-900/95 backdrop-blur-md border border-gray-700/50 rounded-xl px-4 py-3 shadow-2xl">
        <p className="text-white font-semibold text-sm mb-2">{data.dia_espanol}</p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
              <span className="text-gray-300 text-xs">Ventas:</span>
            </div>
            <span className="text-white font-bold text-sm">$ {formatNumber(data.total_ventas_monto)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-purple-400" />
              <span className="text-gray-300 text-xs">Servicios:</span>
            </div>
            <span className="text-white font-bold text-sm">$ {formatNumber(data.total_servicios_monto)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-gray-300 text-xs">Comisiones:</span>
            </div>
            <span className="text-emerald-300 font-bold text-sm">$ {formatNumber(data.total_comisiones)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const ITEMS_PER_PAGE = 5;

export function CommissionsReport() {
  const [state, dispatch] = useReducer(reportReducer, initialReportState);
  const { data, loading, error, period, startDate, endDate, tablePage } = state;

  const totalPages = useMemo(() => {
    if (!data?.commissions) return 0;
    return Math.ceil(data.commissions.length / ITEMS_PER_PAGE);
  }, [data]);

  const fetchData = async () => {
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
      dispatch({ type: 'FETCH_ERROR', payload: err.message });
    }
  };

  useEffect(() => {
    fetchData();
  }, [period, startDate, endDate]);

  const handlePeriodChange = (val: string) => {
    dispatch({ type: 'SET_PERIOD', payload: val });
  };

  const getPerformanceBadge = (comisiones: number, promedio: number) => {
    if (comisiones >= promedio * 1.5) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    if (comisiones >= promedio) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    if (comisiones >= promedio * 0.5) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  };

  const getPerformanceText = (comisiones: number, promedio: number) => {
    if (comisiones >= promedio * 1.5) return 'Excelente';
    if (comisiones >= promedio) return 'Bueno';
    if (comisiones >= promedio * 0.5) return 'Regular';
    return 'Necesita mejorar';
  };

  const topPerformerChartData = useMemo(() => {
    if (!data?.topPerformers) return [];
    return data.topPerformers.map(p => ({
      ...p,
      shortName: p.nombre_completo.split(' ').slice(0, 2).join(' '),
    }));
  }, [data]);

  const dailyChartData = useMemo(() => {
    if (!data?.dailyCommissions) return [];
    return data.dailyCommissions.map(d => ({
      ...d,
      diaCorto: d.dia_espanol.substring(0, 3),
    }));
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Cargando reporte de comisiones...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600">
        <p className="text-sm">Error: {error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center text-gray-600">
        <p className="text-sm">No hay datos disponibles</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Filtros del Reporte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="period-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Período
              </label>
              <Select value={period} onValueChange={handlePeriodChange}>
                <SelectTrigger id="period-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current_month">Mes Actual</SelectItem>
                  <SelectItem value="last_month">Mes Anterior</SelectItem>
                  <SelectItem value="current_year">Año Actual</SelectItem>
                  <SelectItem value="last_year">Año Anterior</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {period === 'custom' && (
              <>
                <div>
                  <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Fecha Inicio
                  </label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => dispatch({ type: 'SET_START_DATE', payload: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Fecha Fin
                  </label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => dispatch({ type: 'SET_END_DATE', payload: e.target.value })}
                  />
                </div>
              </>
            )}

            <div className="flex items-end">
              <Button onClick={fetchData} className="w-full">
                Actualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas Generales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-0 shadow-md dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Anfitrionas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {data.statistics.total_anfitrionas}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Ventas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  $ {formatNumber(data.statistics.total_ventas_general)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {data.statistics.total_ventas_count} transacciones
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Servicios</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  $ {formatNumber(data.statistics.total_servicios_general)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {data.statistics.total_servicios_count} servicios
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Comisiones</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  $ {formatNumber(data.statistics.total_comisiones_general)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Promedio por Anfitriona</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  $ {formatNumber(Math.round(data.statistics.promedio_comision_por_anfitriona || 0))}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {data.statistics.total_anfitrionas} anfitrionas
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Target className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers Chart */}
      <CollapsibleCard
        title={<><Award className="h-5 w-5" /> Top 5 Performers</>}
        headerClassName="bg-gradient-to-r from-amber-500 to-orange-500 text-white"
      >
        <div className="h-[300px] sm:h-[400px] w-full">
          {topPerformerChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topPerformerChartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                <defs>
                  {TOP_PERFORMER_COLORS.map((color, i) => (
                    <linearGradient key={`perfGrad${i}`} id={`perfGrad${i}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={color} stopOpacity={0.85} />
                      <stop offset="100%" stopColor={color} stopOpacity={0.5} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="currentColor"
                  className="text-gray-200 dark:text-gray-700"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tickFormatter={formatCompact}
                  tick={{ fill: 'currentColor', fontSize: 10 }}
                  className="text-gray-500 dark:text-gray-400"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="shortName"
                  width={80}
                  tick={{ fill: 'currentColor', fontSize: 10 }}
                  className="text-gray-700 dark:text-gray-300"
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<PerformerTooltip />} />
                <Bar
                  dataKey="total_comisiones"
                  radius={[0, 6, 6, 0]}
                  animationDuration={800}
                  animationEasing="ease-out"
                  barSize={32}
                >
                  {topPerformerChartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={`url(#perfGrad${index % TOP_PERFORMER_COLORS.length})`}
                      style={{ cursor: 'pointer' }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400">
              <p className="text-sm">No hay datos de performers</p>
            </div>
          )}
        </div>
      </CollapsibleCard>

      {/* Tabla de Comisiones por Anfitriona */}
      <CollapsibleCard
        title={<><UserCheck className="h-5 w-5" /> Comisiones por Anfitriona</>}
        headerRight={
          <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">
            {data.commissions.length} anfitrionas
          </span>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Anfitriona</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Ventas</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Servicios</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Total Ventas</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Total Servicios</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Comisiones</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Prom/Venta</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Prom/Servicio</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Días</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Prom/Día</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Rendimiento</th>
              </tr>
            </thead>
            <tbody>
              {data.commissions
                .slice(tablePage * ITEMS_PER_PAGE, (tablePage + 1) * ITEMS_PER_PAGE)
                .map((commission) => (
                  <tr key={commission.id_usuario} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{commission.nombre_completo}</p>
                    </td>
                    <td className="py-3 px-4 text-gray-900 dark:text-gray-200">{commission.total_ventas}</td>
                    <td className="py-3 px-4 text-gray-900 dark:text-gray-200">{commission.total_servicios}</td>
                    <td className="py-3 px-4 text-gray-900 dark:text-gray-200">$ {formatNumber(commission.total_ventas_monto)}</td>
                    <td className="py-3 px-4 text-gray-900 dark:text-gray-200">$ {formatNumber(commission.total_servicios_monto)}</td>
                    <td className="py-3 px-4 font-semibold text-emerald-600 dark:text-emerald-400">$ {formatNumber(commission.total_comisiones)}</td>
                    <td className="py-3 px-4 text-gray-900 dark:text-gray-200">$ {formatNumber(commission.promedio_por_venta)}</td>
                    <td className="py-3 px-4 text-gray-900 dark:text-gray-200">$ {formatNumber(commission.promedio_por_servicio)}</td>
                    <td className="py-3 px-4 text-gray-900 dark:text-gray-200">{commission.dias_trabajados}</td>
                    <td className="py-3 px-4 text-gray-900 dark:text-gray-200">$ {formatNumber(commission.promedio_diario)}</td>
                    <td className="py-3 px-4">
                      <Badge className={getPerformanceBadge(commission.total_comisiones, data.statistics.promedio_comision_por_anfitriona)}>
                        {getPerformanceText(commission.total_comisiones, data.statistics.promedio_comision_por_anfitriona)}
                      </Badge>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {data.commissions.length > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Mostrando {tablePage * ITEMS_PER_PAGE + 1} - {Math.min((tablePage + 1) * ITEMS_PER_PAGE, data.commissions.length)} de {data.commissions.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => dispatch({ type: 'SET_TABLE_PAGE', payload: Math.max(0, tablePage - 1) })}
                disabled={tablePage === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => (
                  <Button
                    key={i}
                    variant={tablePage === i ? 'default' : 'outline'}
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => dispatch({ type: 'SET_TABLE_PAGE', payload: i })}
                  >
                    {i + 1}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => dispatch({ type: 'SET_TABLE_PAGE', payload: Math.min(totalPages - 1, tablePage + 1) })}
                disabled={tablePage >= totalPages - 1}
              >
                Siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </CollapsibleCard>

      {/* Comisiones por Día de la Semana - Composed Chart */}
      <CollapsibleCard
        title={<><BarChart3 className="h-5 w-5" /> Comisiones por Día de la Semana</>}
        headerClassName="bg-gradient-to-r from-indigo-600 to-blue-600 text-white"
      >
        <div className="h-[320px] sm:h-[450px] w-full">
          {dailyChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={dailyChartData}
                margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="ventasGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.5} />
                  </linearGradient>
                  <linearGradient id="serviciosGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.5} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="currentColor"
                  className="text-gray-200 dark:text-gray-700"
                  vertical={false}
                />
                <XAxis
                  dataKey="diaCorto"
                  tick={{ fill: 'currentColor', fontSize: 10 }}
                  className="text-gray-600 dark:text-gray-400"
                  tickLine={false}
                  axisLine={{ stroke: 'currentColor', className: 'text-gray-300 dark:text-gray-600' }}
                />
                <YAxis
                  tickFormatter={formatCompact}
                  tick={{ fill: 'currentColor', fontSize: 10 }}
                  className="text-gray-500 dark:text-gray-400"
                  tickLine={false}
                  axisLine={false}
                  width={45}
                />
                <Tooltip content={<DailyTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: '8px' }}
                  formatter={(value: string) => (
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{value}</span>
                  )}
                />
                <Bar
                  dataKey="total_ventas_monto"
                  name="Ventas"
                  fill="url(#ventasGrad)"
                  radius={[4, 4, 0, 0]}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
                <Bar
                  dataKey="total_servicios_monto"
                  name="Servicios"
                  fill="url(#serviciosGrad)"
                  radius={[4, 4, 0, 0]}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
                <Line
                  type="monotone"
                  dataKey="total_comisiones"
                  name="Comisiones"
                  stroke="#10B981"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }}
                  animationDuration={1000}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400">
              <p className="text-sm">No hay datos de comisiones diarias</p>
            </div>
          )}
        </div>
      </CollapsibleCard>
    </div>
  );
}
