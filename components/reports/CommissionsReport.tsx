/* eslint-disable */
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
  ChevronRight,
  Download,
  Calendar
} from "lucide-react";
import { formatCurrencyNoDecimals } from "@/lib/utils/formatters";
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

const getCommissionRowKey = (commission: CommissionData, absoluteIndex: number) => {
  const identity = commission.id_usuario ?? commission.nombre_completo ?? `${commission.nombre}-${commission.apellido}`;
  return `${identity}-${absoluteIndex}`;
};

export function CommissionsReport() {
  const [state, dispatch] = useReducer(reportReducer, initialReportState);
  const { data, loading, error, tablePage, period, startDate, endDate } = state;

  const totalPages = useMemo(() => {
    if (!data?.commissions) return 0;
    return Math.ceil(data.commissions.length / ITEMS_PER_PAGE);
  }, [data]);

  const exportReport = () => {
    console.log('Exportando reporte de comisiones...');
  };

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
    <div className="space-y-8 pb-10">
      {/* Filtros Rápidos - Action Chips */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-2 bg-gray-100/50 dark:bg-gray-800/50 p-1.5 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
          {[
            { id: 'current_month', label: 'Mes Actual' },
            { id: 'last_month', label: 'Mes Anterior' },
            { id: 'current_year', label: 'Año Actual' },
            { id: 'last_year', label: 'Año Anterior' },
            { id: 'custom', label: 'Personalizado' },
          ].map((chip) => (
            <button
              key={chip.id}
              onClick={() => dispatch({ type: 'SET_PERIOD', payload: chip.id })}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                period === chip.id
                  ? 'bg-white dark:bg-gray-700 text-green-600 dark:text-green-400 shadow-sm scale-105'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {period === 'custom' && (
            <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-300">
              <input
                type="date"
                value={startDate}
                onChange={(e) => dispatch({ type: 'SET_START_DATE', payload: e.target.value })}
                className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-green-500/20 outline-none transition-all"
              />
              <span className="text-gray-400 font-bold">→</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => dispatch({ type: 'SET_END_DATE', payload: e.target.value })}
                className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-green-500/20 outline-none transition-all"
              />
            </div>
          )}
          
          <Button 
            onClick={exportReport} 
            variant="default" 
            className="rounded-xl px-6 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 shadow-lg shadow-emerald-100 dark:shadow-emerald-900/20 transition-all active:scale-95 text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Estadísticas Generales - Diseño Premium */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {[
          { 
            title: 'Anfitrionas Activas', 
            value: data.statistics.total_anfitrionas,
            icon: Users,
            color: 'blue',
            grad: 'from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20'
          },
          { 
            title: 'Ventas Generadas', 
            value: `$${formatNumber(data.statistics.total_ventas_general)}`,
            sub: `${data.statistics.total_ventas_count} transacciones`,
            icon: TrendingUp,
            color: 'emerald',
            grad: 'from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20'
          },
          { 
            title: 'Servicios Realizados', 
            value: `$${formatNumber(data.statistics.total_servicios_general)}`,
            sub: `${data.statistics.total_servicios_count} servicios`,
            icon: Target,
            color: 'violet',
            grad: 'from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20'
          },
          { 
            title: 'Comisiones Totales', 
            value: `$${formatNumber(data.statistics.total_comisiones_general)}`,
            icon: DollarSign,
            color: 'purple',
            grad: 'from-purple-50 to-fuchsia-50 dark:from-purple-950/20 dark:to-fuchsia-950/20'
          },
          { 
            title: 'Promedio x Anfitriona', 
            value: `$${formatNumber(Math.round(data.statistics.promedio_comision_por_anfitriona || 0))}`,
            icon: Award,
            color: 'orange',
            grad: 'from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20'
          },
        ].map((stat, i) => (
          <Card key={i} className={`relative border-0 shadow-xl shadow-gray-200/50 dark:shadow-black/20 overflow-hidden group hover:scale-[1.02] transition-all duration-300`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.grad} opacity-50`}></div>
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{stat.title}</CardTitle>
              <div className={`w-10 h-10 rounded-2xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center group-hover:rotate-12 transition-transform`}>
                <stat.icon className={`h-5 w-5 text-${stat.color}-600 dark:text-${stat.color}-400`} />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                {stat.value}
              </div>
              {stat.sub && (
                <p className="text-xs font-medium text-gray-500 mt-1">
                  {stat.sub}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráfico de Mejores Anfitrionas con Diseño Premium */}
      <Card className="border-0 shadow-2xl shadow-gray-200/50 dark:shadow-black/40 rounded-3xl overflow-hidden bg-white dark:bg-gray-800/50 backdrop-blur-md">
        <CardHeader className="border-b border-gray-50 dark:border-gray-700/50 pb-4">
          <CardTitle className="text-lg font-black flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Award className="h-4 w-4 text-amber-600" />
            </div>
            Top Performers (Ranking Comisiones)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-8">
          <div className="h-[400px] w-full">
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
                        <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                        <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                      </linearGradient>
                    ))}
                    <filter id="shadowBar" height="200%">
                      <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.15"/>
                    </filter>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="currentColor"
                    className="text-gray-100 dark:text-gray-700/50"
                    horizontal={false}
                    vertical={true}
                  />
                  <XAxis
                    type="number"
                    tickFormatter={formatCompact}
                    tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 600 }}
                    className="text-gray-400 dark:text-gray-500"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="shortName"
                    width={90}
                    tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 700 }}
                    className="text-gray-700 dark:text-gray-300"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    content={<PerformerTooltip />} 
                    cursor={{ fill: 'currentColor', className: 'text-gray-50 dark:text-gray-800/40', radius: 8 }}
                  />
                  <Bar
                    dataKey="total_comisiones"
                    name="Comisión Total"
                    radius={[0, 8, 8, 0]}
                    animationDuration={1500}
                    animationEasing="ease-out"
                    barSize={32}
                    style={{ filter: 'url(#shadowBar)' }}
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
              <div className="flex items-center justify-center h-full text-gray-400 italic">
                <p className="text-sm">No hay datos de performers</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
                .map((commission, index) => (
                  <tr key={getCommissionRowKey(commission, tablePage * ITEMS_PER_PAGE + index)} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
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

