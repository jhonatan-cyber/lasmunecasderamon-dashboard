/* eslint-disable */
'use client';

import { useEffect, useState, useMemo, useReducer } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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

// REDUCER FOR STATE MANAGEMENT
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
  const { period, startDate, endDate, data, loading } = state;

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
      console.error('Error fetching cash register data:', e);
      dispatch({ type: 'FETCH_ERROR' });
    }
  };

  const exportReport = () => {
    // TODO: exportar a CSV/PDF si se requiere
  };

  // CHART DATA
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
      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Período:</span>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="period-select" className="sr-only">Seleccionar período</label>
                <Select value={period} onValueChange={(v: string) => dispatch({ type: 'SET_PERIOD', payload: v })}>
                  <SelectTrigger id="period-select" className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Hoy</SelectItem>
                    <SelectItem value="yesterday">Ayer</SelectItem>
                    <SelectItem value="week">Esta Semana</SelectItem>
                    <SelectItem value="month">Este Mes</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {period === 'custom' && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <label htmlFor="start-date" className="sr-only">Fecha inicial</label>
                    <input id="start-date" type="date" value={startDate} onChange={e => dispatch({ type: 'SET_START_DATE', payload: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  </div>
                  <span className="text-gray-500">a</span>
                  <div className="flex items-center gap-1">
                    <label htmlFor="end-date" className="sr-only">Fecha final</label>
                    <input id="end-date" type="date" value={endDate} onChange={e => dispatch({ type: 'SET_END_DATE', payload: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm">Caja</Badge>
              <Button onClick={exportReport} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Balance de Caja */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-0 shadow-md dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Apertura Total</CardTitle>
            <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyNoDecimals(data.summary.apertura_total)}</div>
            <p className="text-xs text-muted-foreground">{data.summary.cajas} cajas</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cierre Total</CardTitle>
            <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyNoDecimals(data.summary.cierre_total)}</div>
            <p className="text-xs text-muted-foreground">Suma de cierres</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Diferencia Total</CardTitle>
            <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyNoDecimals(data.summary.diferencia_total)}</div>
            <p className="text-xs text-muted-foreground">Cierre - (Apertura + Ingresos - Dev.)</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Devoluciones</CardTitle>
            <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <ArrowDownCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyNoDecimals(data.summary.devoluciones)}</div>
            <p className="text-xs text-muted-foreground">Total devuelto</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">IVA</CardTitle>
            <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyNoDecimals(data.summary.iva)}</div>
            <p className="text-xs text-muted-foreground">Total IVA</p>
          </CardContent>
        </Card>
      </div>

      {/* Row: Métodos de Pago (Donut) + Flujo de Efectivo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut - Métodos de Pago */}
        <CollapsibleCard
          title={<><Wallet className="h-5 w-5" /> Distribución por Método de Pago</>}
          headerClassName="bg-gradient-to-r from-violet-600 to-purple-600 text-white"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="h-[240px] sm:h-[300px] w-full">
              {paymentPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={95}
                      paddingAngle={4}
                      strokeWidth={0}
                      animationDuration={800}
                      animationEasing="ease-out"
                      label={renderPieLabel}
                      labelLine={false}
                    >
                      {paymentPieData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PAYMENT_COLORS[index % PAYMENT_COLORS.length]}
                          style={{ cursor: 'pointer', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <p className="text-sm">Sin datos</p>
                </div>
              )}
            </div>
            <div className="space-y-3">
              {[
                { label: 'Efectivo', value: data.summary.efectivo, color: PAYMENT_COLORS[0] },
                { label: 'Tarjeta', value: data.summary.tarjeta, color: PAYMENT_COLORS[1] },
                { label: 'Transferencia', value: data.summary.transferencia, color: PAYMENT_COLORS[2] },
              ].map((item, i) => {
                const total = parseFloat(String(data.summary.efectivo || 0)) + parseFloat(String(data.summary.tarjeta || 0)) + parseFloat(String(data.summary.transferencia || 0));
                const pct = total > 0 ? ((parseFloat(String(item.value || 0)) / total) * 100).toFixed(1) : '0';
                return (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-8 rounded-full" style={{ backgroundColor: item.color }} />
                      <div>
                        <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{item.label}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{pct}%</p>
                      </div>
                    </div>
                    <p className="text-lg font-bold" style={{ color: item.color }}>
                      {formatCurrencyNoDecimals(item.value)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </CollapsibleCard>

        {/* Flujo de Efectivo - Barras */}
        <CollapsibleCard
          title={<><DollarSign className="h-5 w-5" /> Flujo de Efectivo</>}
          headerClassName="bg-gradient-to-r from-emerald-600 to-teal-600 text-white"
        >
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 rounded-xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/10 border border-green-200 dark:border-green-700">
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400 mx-auto mb-1" />
              <p className="text-xs text-green-600 dark:text-green-400 font-medium">Entradas</p>
              <p className="text-lg font-bold text-green-900 dark:text-green-100">{formatCurrencyNoDecimals(data.flujoEfectivo.entradas)}</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/10 border border-red-200 dark:border-red-700">
              <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400 mx-auto mb-1" />
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">Salidas</p>
              <p className="text-lg font-bold text-red-900 dark:text-red-100">{formatCurrencyNoDecimals(data.flujoEfectivo.salidas)}</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/10 border border-blue-200 dark:border-blue-700">
              <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Neto</p>
              <p className="text-lg font-bold text-blue-900 dark:text-blue-100">{formatCurrencyNoDecimals(data.flujoEfectivo.neto)}</p>
            </div>
          </div>
          <div className="h-[220px] sm:h-[300px] w-full">
            {flowBarData.length > 0 && (flowBarData[0].Entradas > 0 || flowBarData[0].Salidas > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={flowBarData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="flowEntradas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0.5} />
                    </linearGradient>
                    <linearGradient id="flowSalidas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#EF4444" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#EF4444" stopOpacity={0.5} />
                    </linearGradient>
                    <linearGradient id="flowNeto" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.5} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-700" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 10 }} className="text-gray-600 dark:text-gray-400" tickLine={false} />
                  <YAxis tickFormatter={formatCompact} tick={{ fill: 'currentColor', fontSize: 10 }} className="text-gray-500 dark:text-gray-400" tickLine={false} axisLine={false} width={45} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="Entradas" fill="url(#flowEntradas)" radius={[4, 4, 0, 0]} barSize={40} animationDuration={800} />
                  <Bar dataKey="Salidas" fill="url(#flowSalidas)" radius={[4, 4, 0, 0]} barSize={40} animationDuration={800} />
                  <Bar dataKey="Neto" fill="url(#flowNeto)" radius={[4, 4, 0, 0]} barSize={40} animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <p className="text-sm">Sin flujo de efectivo registrado</p>
              </div>
            )}
          </div>
        </CollapsibleCard>
      </div>

      {/* Movimientos: Ingresos vs Egresos */}
      <CollapsibleCard
        title={<><ArrowUpCircle className="h-5 w-5" /> Movimientos de Caja</>}
        headerClassName="bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Chart */}
          <div className="h-[250px] sm:h-[350px] w-full">
            {movBarData.length > 0 && movBarData.some(d => d.valor > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={movBarData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="movIngresos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0.5} />
                    </linearGradient>
                    <linearGradient id="movEgresos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#EF4444" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#EF4444" stopOpacity={0.5} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-700" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 10 }} className="text-gray-600 dark:text-gray-400" tickLine={false} />
                  <YAxis tickFormatter={formatCompact} tick={{ fill: 'currentColor', fontSize: 10 }} className="text-gray-500 dark:text-gray-400" tickLine={false} axisLine={false} width={45} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="valor" radius={[6, 6, 0, 0]} barSize={60} animationDuration={800}>
                    {movBarData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? 'url(#movIngresos)' : 'url(#movEgresos)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <p className="text-sm">Sin movimientos registrados</p>
              </div>
            )}
          </div>

          {/* Detalle */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/10 border border-green-200 dark:border-green-700">
              <p className="text-sm font-semibold text-green-800 dark:text-green-300 mb-2">Ingresos</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">{formatCurrencyNoDecimals(data.movimientos.ingresos.total)}</p>
              <div className="mt-3 space-y-1">
                {data.movimientos.ingresos.detalle.map((d, i) => (
                  <div key={i} className="flex justify-between text-sm text-green-700 dark:text-green-400">
                    <span className="capitalize">{d.tipo}</span>
                    <span className="font-medium">{formatCurrencyNoDecimals(d.monto)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/10 border border-red-200 dark:border-red-700">
              <p className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">Egresos</p>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100">{formatCurrencyNoDecimals(data.movimientos.egresos.total)}</p>
              <div className="mt-3 space-y-1">
                {data.movimientos.egresos.detalle.map((d, i) => (
                  <div key={i} className="flex justify-between text-sm text-red-700 dark:text-red-400">
                    <span className="capitalize">{d.tipo}</span>
                    <span className="font-medium">{formatCurrencyNoDecimals(d.monto)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CollapsibleCard>

      {/* Cajas por Turno - Chart + Table */}
      <CollapsibleCard
        title={<><BarChart3 className="h-5 w-5" /> Cierre de Caja por Turno</>}
        headerClassName="bg-gradient-to-r from-amber-500 to-orange-500 text-white"
      >
        {/* Chart de Cajas */}
        {cajasBarData.length > 0 && (
          <div className="mb-6 h-[260px] sm:h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cajasBarData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="cajasApertura" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.5} />
                  </linearGradient>
                  <linearGradient id="cajasCierre" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0.5} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-700" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 10 }} className="text-gray-600 dark:text-gray-400" tickLine={false} />
                <YAxis tickFormatter={formatCompact} tick={{ fill: 'currentColor', fontSize: 10 }} className="text-gray-500 dark:text-gray-400" tickLine={false} axisLine={false} width={45} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: '8px' }}
                  formatter={(value: string) => (
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{value}</span>
                  )}
                />
                <Bar dataKey="Apertura" fill="url(#cajasApertura)" radius={[4, 4, 0, 0]} animationDuration={800} />
                <Bar dataKey="Cierre" fill="url(#cajasCierre)" radius={[4, 4, 0, 0]} animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="px-3 py-2 text-left font-medium text-gray-900 dark:text-gray-100">Caja</th>
                <th className="px-3 py-2 text-left font-medium text-gray-900 dark:text-gray-100">Apertura</th>
                <th className="px-3 py-2 text-left font-medium text-gray-900 dark:text-gray-100">Cierre</th>
                <th className="px-3 py-2 text-left font-medium text-gray-900 dark:text-gray-100">Turno</th>
                <th className="px-3 py-2 text-right font-medium text-gray-900 dark:text-gray-100">M. Apertura</th>
                <th className="px-3 py-2 text-right font-medium text-gray-900 dark:text-gray-100">Ingresos</th>
                <th className="px-3 py-2 text-right font-medium text-gray-900 dark:text-gray-100">Dev.</th>
                <th className="px-3 py-2 text-right font-medium text-gray-900 dark:text-gray-100">M. Cierre</th>
                <th className="px-3 py-2 text-right font-medium text-gray-900 dark:text-gray-100">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {data.cajas.map((c) => (
                <tr key={c.id_caja} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-3 py-2 font-medium">#{c.id_caja}</td>
                  <td className="px-3 py-2 text-sm">{formatLongDateEs(c.fecha_apertura)}</td>
                  <td className="px-3 py-2 text-sm">{c.fecha_cierre ? formatLongDateEs(c.fecha_cierre) : '-'}</td>
                  <td className="px-3 py-2">
                    <Badge className={c.turno === 'Día' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400'}>
                      {c.turno}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-right">{formatCurrencyNoDecimals(c.monto_apertura || 0)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrencyNoDecimals((c.efectivo || 0) + (c.tarjeta || 0) + (c.transferencia || 0))}</td>
                  <td className="px-3 py-2 text-right">{formatCurrencyNoDecimals(c.devoluciones || 0)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrencyNoDecimals(c.monto_cierre || 0)}</td>
                  <td className="px-3 py-2 text-right">
                    <span className={parseFloat(String(c.diferencia)) >= 0 ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-red-600 dark:text-red-400 font-semibold'}>
                      {formatCurrencyNoDecimals(c.diferencia || 0)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CollapsibleCard>
    </div>
  );
}

