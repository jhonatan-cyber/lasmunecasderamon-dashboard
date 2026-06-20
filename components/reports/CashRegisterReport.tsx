/* eslint-disable */
'use client';

import { useEffect, useState, useMemo, useReducer } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import logger from '@/lib/utils/logger';

import {
  Calendar,
  Download,
  DollarSign,
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  Wallet,
  TrendingUp,
  TrendingDown,
  BarChart3,
} from 'lucide-react';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { formatLongDateEs } from '@/lib/utils/calendarUtils';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';

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
  loading: true,
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

const PAYMENT_COLORS = ['#10B981', '#3B82F6', '#8B5CF6'];
const FLOW_COLORS = { entradas: '#10B981', salidas: '#EF4444', neto: '#3B82F6' };

const formatNumber = (amount: number) => {
  if (!amount || isNaN(amount)) return '0';
  return Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const formatCompact = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
  return `$${value}`;
};

interface GenericTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; payload: { fill?: string } }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: GenericTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900/95 backdrop-blur-md border border-gray-700/50 rounded-xl px-4 py-3 shadow-2xl">
        {label && <p className="text-white font-semibold text-sm mb-2">{label}</p>}
        <div className="space-y-1.5">
          {payload.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color || item.payload?.fill }} />
              <span className="text-gray-300 text-xs">{item.name}:</span>
              <span className="text-white font-bold text-sm ml-auto">
                $ {formatNumber(item.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const PieTooltip = ({ active, payload }: GenericTooltipProps) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    return (
      <div className="bg-gray-900/95 backdrop-blur-md border border-gray-700/50 rounded-xl px-4 py-3 shadow-2xl">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.payload?.fill || item.color }} />
          <span className="text-white font-semibold text-sm">{item.name}</span>
        </div>
        <p className="text-emerald-300 font-bold text-lg">$ {formatNumber(item.value)}</p>
      </div>
    );
  }
  return null;
};

const renderPieLabel = ({ cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0 }: {
  cx?: number; cy?: number; midAngle?: number; innerRadius?: number; outerRadius?: number; percent?: number;
}) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export function CashRegisterReport() {
  const [state, dispatch] = useReducer(reportReducer, initialReportState);
  const { data, loading, period, startDate, endDate } = state;

  useEffect(() => {
    fetchData();
  }, [period, startDate, endDate]);

  const fetchData = async () => {
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
      if (json.success) dispatch({ type: 'FETCH_SUCCESS', payload: json.data });
    } catch (e) {
      logger.captureException(e, { context: 'CashRegisterReport:unknown' });
      dispatch({ type: 'FETCH_ERROR' });
    }
  };

  const exportReport = () => {
    
  };

  
  const paymentPieData = useMemo(() => {
    if (!data?.summary) return [];
    return [
      { name: 'Efectivo', value: parseFloat(String(data.summary.efectivo)) || 0 },
      { name: 'Tarjeta', value: parseFloat(String(data.summary.tarjeta)) || 0 },
      { name: 'Transferencia', value: parseFloat(String(data.summary.transferencia)) || 0 },
    ].filter(d => d.value > 0);
  }, [data]);

  const flowBarData = useMemo(() => {
    if (!data?.flujoEfectivo) return [];
    return [
      {
        name: 'Flujo de Efectivo',
        Entradas: parseFloat(String(data.flujoEfectivo.entradas)) || 0,
        Salidas: parseFloat(String(data.flujoEfectivo.salidas)) || 0,
        Neto: parseFloat(String(data.flujoEfectivo.neto)) || 0,
      },
    ];
  }, [data]);

  const movBarData = useMemo(() => {
    if (!data?.movimientos) return [];
    return [
      { name: 'Ingresos', valor: parseFloat(String(data.movimientos.ingresos.total)) || 0, fill: '#10B981' },
      { name: 'Egresos', valor: parseFloat(String(data.movimientos.egresos.total)) || 0, fill: '#EF4444' },
    ];
  }, [data]);

  const cajasBarData = useMemo(() => {
    if (!data?.cajas) return [];
    return data.cajas.map(c => ({
      name: `#${c.id_caja}`,
      turno: c.turno,
      Apertura: parseFloat(String(c.monto_apertura)) || 0,
      Cierre: parseFloat(String(c.monto_cierre)) || 0,
      Diferencia: parseFloat(String(c.diferencia)) || 0,
    }));
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando reporte de caja...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 bg-blue-100 border border-blue-300 rounded-lg">
        <p className="text-blue-800">No hay datos disponibles para el reporte de caja</p>
        <p className="text-sm text-blue-600">Estado: Sin datos</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-2 bg-gray-100/50 dark:bg-gray-800/50 p-1.5 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
          {[
            { id: 'today', label: 'Hoy' },
            { id: 'yesterday', label: 'Ayer' },
            { id: 'week', label: 'Esta Semana' },
            { id: 'month', label: 'Este Mes' },
            { id: 'custom', label: 'Personalizado' },
          ].map((chip) => (
            <button
              key={chip.id}
              onClick={() => dispatch({ type: 'SET_PERIOD', payload: chip.id })}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                period === chip.id
                  ? 'bg-white dark:bg-gray-700 text-yellow-600 dark:text-yellow-400 shadow-sm scale-105'
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
                className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-yellow-500/20 outline-none transition-all"
              />
              <span className="text-gray-400 font-bold">→</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => dispatch({ type: 'SET_END_DATE', payload: e.target.value })}
                className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-yellow-500/20 outline-none transition-all"
              />
            </div>
          )}
          
          <Button 
            onClick={exportReport} 
            variant="default" 
            className="rounded-xl px-6 bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-600 dark:hover:bg-yellow-700 shadow-lg shadow-yellow-100 dark:shadow-yellow-900/20 transition-all active:scale-95 text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { 
            title: 'Apertura', 
            label: 'Caja Inicial',
            value: formatCurrencyNoDecimals(data.summary.apertura_total),
            sub: `${data.summary.cajas} cajas operativas`,
            icon: Clock,
            bgColor: 'bg-blue-500/10 dark:bg-blue-500/20',
            borderColor: 'border-blue-500/20',
            iconBg: 'bg-blue-500/20',
            textColor: 'text-blue-700 dark:text-blue-400',
            textMuted: 'text-blue-700/60 dark:text-blue-400/60',
          },
          { 
            title: 'Cierre', 
            label: 'Total Reportado',
            value: formatCurrencyNoDecimals(data.summary.cierre_total),
            sub: 'Suma de cierres',
            icon: Wallet,
            bgColor: 'bg-emerald-500/10 dark:bg-emerald-500/20',
            borderColor: 'border-emerald-500/20',
            iconBg: 'bg-emerald-500/20',
            textColor: 'text-emerald-700 dark:text-emerald-400',
            textMuted: 'text-emerald-700/60 dark:text-emerald-400/60',
          },
          { 
            title: 'Diferencia', 
            label: 'Descuadre',
            value: formatCurrencyNoDecimals(data.summary.diferencia_total),
            sub: 'Cierre - Total',
            icon: data.summary.diferencia_total < 0 ? TrendingDown : TrendingUp,
            bgColor: data.summary.diferencia_total < 0 ? 'bg-red-500/10 dark:bg-red-500/20' : 'bg-amber-500/10 dark:bg-amber-500/20',
            borderColor: data.summary.diferencia_total < 0 ? 'border-red-500/20' : 'border-amber-500/20',
            iconBg: data.summary.diferencia_total < 0 ? 'bg-red-500/20' : 'bg-amber-500/20',
            textColor: data.summary.diferencia_total < 0 ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400',
            textMuted: data.summary.diferencia_total < 0 ? 'text-red-700/60 dark:text-red-400/60' : 'text-amber-700/60 dark:text-amber-400/60',
          },
          { 
            title: 'Devoluciones', 
            label: 'Reintegros',
            value: formatCurrencyNoDecimals(data.summary.devoluciones),
            sub: 'Total reintegrado',
            icon: ArrowDownCircle,
            bgColor: 'bg-rose-500/10 dark:bg-rose-500/20',
            borderColor: 'border-rose-500/20',
            iconBg: 'bg-rose-500/20',
            textColor: 'text-rose-700 dark:text-rose-400',
            textMuted: 'text-rose-700/60 dark:text-rose-400/60',
          },
          { 
            title: 'Impuestos', 
            label: 'IVA Retenido',
            value: formatCurrencyNoDecimals(data.summary.iva),
            sub: 'Transacciones',
            icon: DollarSign,
            bgColor: 'bg-purple-500/10 dark:bg-purple-500/20',
            borderColor: 'border-purple-500/20',
            iconBg: 'bg-purple-500/20',
            textColor: 'text-purple-700 dark:text-purple-400',
            textMuted: 'text-purple-700/60 dark:text-purple-400/60',
          },
        ].map((stat, i) => (
          <Card 
            key={i} 
            className={`shadow-sm backdrop-blur-sm rounded-[2rem] overflow-hidden group hover:scale-[1.02] transition-all duration-300 border ${stat.bgColor} ${stat.borderColor}`}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2.5 rounded-2xl ${stat.iconBg}`}>
                  <stat.icon className={`h-4 w-4 ${stat.textColor}`} />
                </div>
                <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-full text-center ${stat.textColor} ${stat.iconBg}`}>
                  {stat.title}
                </span>
              </div>
              <div className="space-y-0.5 text-center sm:text-left">
                <p className={`text-[10px] font-bold uppercase tracking-widest ${stat.textMuted}`}>
                  {stat.label}
                </p>
                <h3 className={`text-xl sm:text-2xl font-black ${stat.textColor} truncate`}>
                  {stat.value}
                </h3>
                <div className="flex items-center justify-center sm:justify-start gap-1.5 pt-1">
                  <span className={`text-[10px] font-medium uppercase tracking-tighter italic ${stat.textMuted} truncate`}>
                    {stat.sub}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {}
        <Card className="border-0 shadow-2xl shadow-gray-200/50 dark:shadow-black/40 rounded-3xl overflow-hidden bg-white dark:bg-gray-800/50 backdrop-blur-md">
          <CardHeader className="border-b border-gray-50 dark:border-gray-700/50 pb-4">
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                <Wallet className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              Distribución por Método de Pago
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="h-[240px] sm:h-[300px] w-full relative">
                {paymentPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        <filter id="pieShadow" x="-20%" y="-20%" width="140%" height="140%">
                          <feDropShadow dx="0" dy="8" stdDeviation="8" floodOpacity="0.2"/>
                        </filter>
                      </defs>
                      <Pie
                        data={paymentPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={100}
                        paddingAngle={6}
                        strokeWidth={0}
                        animationDuration={1200}
                        animationEasing="ease-out"
                        label={renderPieLabel}
                        labelLine={false}
                      >
                        {paymentPieData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={PAYMENT_COLORS[index % PAYMENT_COLORS.length]}
                            style={{ cursor: 'pointer', filter: 'url(#pieShadow)' }}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 italic">
                    <p className="text-sm">Sin datos</p>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                {[
                  { label: 'Efectivo', value: data.summary.efectivo, color: PAYMENT_COLORS[0] },
                  { label: 'Tarjeta', value: data.summary.tarjeta, color: PAYMENT_COLORS[1] },
                  { label: 'Transferencia', value: data.summary.transferencia, color: PAYMENT_COLORS[2] },
                ].map((item, i) => {
                  const total = parseFloat(String(data.summary.efectivo || 0)) + parseFloat(String(data.summary.tarjeta || 0)) + parseFloat(String(data.summary.transferencia || 0));
                  const pct = total > 0 ? ((parseFloat(String(item.value || 0)) / total) * 100).toFixed(1) : '0';
                  return (
                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-700 transition-colors shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-2 h-10 rounded-full" style={{ backgroundColor: item.color }} />
                        <div>
                          <p className="font-bold text-sm text-gray-900 dark:text-gray-100">{item.label}</p>
                          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500">{pct}%</p>
                        </div>
                      </div>
                      <p className="text-xl font-black" style={{ color: item.color }}>
                        {formatCurrencyNoDecimals(item.value)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {}
        <Card className="border-0 shadow-2xl shadow-gray-200/50 dark:shadow-black/40 rounded-3xl overflow-hidden bg-white dark:bg-gray-800/50 backdrop-blur-md">
          <CardHeader className="border-b border-gray-50 dark:border-gray-700/50 pb-4">
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              Flujo de Efectivo
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10 border border-green-100 dark:border-green-800/50 shadow-sm transition-transform hover:scale-105">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400 mx-auto mb-2 opacity-80" />
                <p className="text-xs text-green-600 dark:text-green-400 font-bold uppercase tracking-wider mb-1">Entradas</p>
                <p className="text-xl font-black text-green-900 dark:text-green-100">{formatCurrencyNoDecimals(data.flujoEfectivo.entradas)}</p>
              </div>
              <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/10 border border-red-100 dark:border-red-800/50 shadow-sm transition-transform hover:scale-105">
                <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400 mx-auto mb-2 opacity-80" />
                <p className="text-xs text-red-600 dark:text-red-400 font-bold uppercase tracking-wider mb-1">Salidas</p>
                <p className="text-xl font-black text-red-900 dark:text-red-100">{formatCurrencyNoDecimals(data.flujoEfectivo.salidas)}</p>
              </div>
              <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 border border-blue-100 dark:border-blue-800/50 shadow-sm transition-transform hover:scale-105">
                <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400 mx-auto mb-2 opacity-80" />
                <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider mb-1">Neto</p>
                <p className="text-xl font-black text-blue-900 dark:text-blue-100">{formatCurrencyNoDecimals(data.flujoEfectivo.neto)}</p>
              </div>
            </div>
            <div className="h-[220px] sm:h-[300px] w-full">
              {flowBarData.length > 0 && (flowBarData[0].Entradas > 0 || flowBarData[0].Salidas > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={flowBarData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="flowEntradas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={1} />
                        <stop offset="100%" stopColor="#34D399" stopOpacity={0.6} />
                      </linearGradient>
                      <linearGradient id="flowSalidas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#EF4444" stopOpacity={1} />
                        <stop offset="100%" stopColor="#F87171" stopOpacity={0.6} />
                      </linearGradient>
                      <linearGradient id="flowNeto" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity={1} />
                        <stop offset="100%" stopColor="#60A5FA" stopOpacity={0.6} />
                      </linearGradient>
                      <filter id="flowShadow" height="200%">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.1"/>
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-100 dark:text-gray-800" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 600 }} className="text-gray-400 dark:text-gray-500" tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={formatCompact} tick={{ fill: 'currentColor', fontSize: 10 }} className="text-gray-400 dark:text-gray-500" tickLine={false} axisLine={false} width={45} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)', radius: 8 }} />
                    <Bar dataKey="Entradas" fill="url(#flowEntradas)" radius={[6, 6, 0, 0]} barSize={36} animationDuration={1200} style={{ filter: 'url(#flowShadow)' }} />
                    <Bar dataKey="Salidas" fill="url(#flowSalidas)" radius={[6, 6, 0, 0]} barSize={36} animationDuration={1200} style={{ filter: 'url(#flowShadow)' }} />
                    <Bar dataKey="Neto" fill="url(#flowNeto)" radius={[6, 6, 0, 0]} barSize={36} animationDuration={1200} style={{ filter: 'url(#flowShadow)' }} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 italic">
                  <p className="text-sm">Sin flujo de efectivo registrado</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {}
      <Card className="border-0 shadow-2xl shadow-gray-200/50 dark:shadow-black/40 rounded-3xl overflow-hidden bg-white dark:bg-gray-800/50 backdrop-blur-md">
        <CardHeader className="border-b border-gray-50 dark:border-gray-700/50 pb-4">
          <CardTitle className="text-lg font-black flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
              <ArrowUpCircle className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            Movimientos de Caja Detallados
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {}
            <div className="h-[250px] sm:h-[350px] w-full">
              {movBarData.length > 0 && movBarData.some(d => d.valor > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={movBarData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="movIngresos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={1} />
                        <stop offset="100%" stopColor="#34D399" stopOpacity={0.6} />
                      </linearGradient>
                      <linearGradient id="movEgresos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#EF4444" stopOpacity={1} />
                        <stop offset="100%" stopColor="#F87171" stopOpacity={0.6} />
                      </linearGradient>
                      <filter id="movShadow" height="200%">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.1"/>
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-100 dark:text-gray-800" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 600 }} className="text-gray-400 dark:text-gray-500" tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={formatCompact} tick={{ fill: 'currentColor', fontSize: 10 }} className="text-gray-400 dark:text-gray-500" tickLine={false} axisLine={false} width={45} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)', radius: 8 }} />
                    <Bar dataKey="valor" radius={[8, 8, 0, 0]} barSize={48} animationDuration={1200} style={{ filter: 'url(#movShadow)' }}>
                      {movBarData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? 'url(#movIngresos)' : 'url(#movEgresos)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 italic">
                  <p className="text-sm">Sin movimientos registrados</p>
                </div>
              )}
            </div>

            {}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10 border border-green-100 dark:border-green-800/50 shadow-sm flex flex-col justify-between">
                <div>
                  <p className="text-sm font-bold text-green-800 dark:text-green-400 mb-1 uppercase tracking-wider">Total Ingresos</p>
                  <p className="text-3xl font-black text-green-900 dark:text-green-100 mb-4">{formatCurrencyNoDecimals(data.movimientos.ingresos.total)}</p>
                  <div className="space-y-2">
                    {data.movimientos.ingresos.detalle.map((d, i) => (
                      <div key={i} className="flex justify-between items-center text-sm border-b border-green-200/50 dark:border-green-800/50 pb-1 last:border-0">
                        <span className="capitalize text-green-700 dark:text-green-300">{d.tipo}</span>
                        <span className="font-bold text-green-900 dark:text-green-100">{formatCurrencyNoDecimals(d.monto)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/10 border border-red-100 dark:border-red-800/50 shadow-sm flex flex-col justify-between">
                <div>
                  <p className="text-sm font-bold text-red-800 dark:text-red-400 mb-1 uppercase tracking-wider">Total Egresos</p>
                  <p className="text-3xl font-black text-red-900 dark:text-red-100 mb-4">{formatCurrencyNoDecimals(data.movimientos.egresos.total)}</p>
                  <div className="space-y-2">
                    {data.movimientos.egresos.detalle.map((d, i) => (
                      <div key={i} className="flex justify-between items-center text-sm border-b border-red-200/50 dark:border-red-800/50 pb-1 last:border-0">
                        <span className="capitalize text-red-700 dark:text-red-300">{d.tipo}</span>
                        <span className="font-bold text-red-900 dark:text-red-100">{formatCurrencyNoDecimals(d.monto)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {}
      <Card className="border-0 shadow-2xl shadow-gray-200/50 dark:shadow-black/40 rounded-3xl overflow-hidden bg-white dark:bg-gray-800/50 backdrop-blur-md mb-8">
        <CardHeader className="border-b border-gray-50 dark:border-gray-700/50 pb-4">
          <CardTitle className="text-lg font-black flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <BarChart3 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            Desempeño de Cajas por Turno
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 px-0 sm:px-6">
          {}
          {cajasBarData.length > 0 && (
            <div className="mb-8 h-[260px] sm:h-[350px] w-full px-4 sm:px-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cajasBarData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="cajasApertura" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity={1} />
                      <stop offset="100%" stopColor="#60A5FA" stopOpacity={0.6} />
                    </linearGradient>
                    <linearGradient id="cajasCierre" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={1} />
                      <stop offset="100%" stopColor="#34D399" stopOpacity={0.6} />
                    </linearGradient>
                    <filter id="cajasShadow" height="200%">
                      <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.1"/>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-100 dark:text-gray-800" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 600 }} className="text-gray-400 dark:text-gray-500" tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={formatCompact} tick={{ fill: 'currentColor', fontSize: 10 }} className="text-gray-400 dark:text-gray-500" tickLine={false} axisLine={false} width={45} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)', radius: 8 }} />
                  <Legend
                    wrapperStyle={{ paddingTop: '16px' }}
                    formatter={(value: string) => (
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{value}</span>
                    )}
                  />
                  <Bar dataKey="Apertura" fill="url(#cajasApertura)" radius={[6, 6, 0, 0]} animationDuration={1200} style={{ filter: 'url(#cajasShadow)' }} />
                  <Bar dataKey="Cierre" fill="url(#cajasCierre)" radius={[6, 6, 0, 0]} animationDuration={1200} style={{ filter: 'url(#cajasShadow)' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {}
          <div className="overflow-x-auto border-t border-gray-100 dark:border-gray-800">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50/50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 text-left font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Caja</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Apertura</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Cierre</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Turno</th>
                  <th className="px-4 py-3 text-right font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">M. Apertura</th>
                  <th className="px-4 py-3 text-right font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Ingresos</th>
                  <th className="px-4 py-3 text-right font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Dev.</th>
                  <th className="px-4 py-3 text-right font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">M. Cierre</th>
                  <th className="px-4 py-3 text-right font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Diferencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {data.cajas.map((c) => (
                  <tr key={c.id_caja} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">#{c.id_caja}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{formatLongDateEs(c.fecha_apertura)}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{c.fecha_cierre ? formatLongDateEs(c.fecha_cierre) : '-'}</td>
                    <td className="px-4 py-3">
                      <Badge className={c.turno === 'Día' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 shadow-sm border-0' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 shadow-sm border-0'}>
                        {c.turno}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">{formatCurrencyNoDecimals(c.monto_apertura || 0)}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">{formatCurrencyNoDecimals((c.efectivo || 0) + (c.tarjeta || 0) + (c.transferencia || 0))}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">{formatCurrencyNoDecimals(c.devoluciones || 0)}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">{formatCurrencyNoDecimals(c.monto_cierre || 0)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2 py-1 rounded-md font-bold text-xs ${parseFloat(String(c.diferencia)) >= 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {formatCurrencyNoDecimals(c.diferencia || 0)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

