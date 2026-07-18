'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, ArrowUpCircle, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
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
} from 'recharts';
import { useCashRegisterReport } from './hooks/useCashRegisterReport';
import { CashRegisterHeader } from './CashRegisterHeader';
import { CashRegisterSummary } from './CashRegisterSummary';
import { CashRegisterTable } from './CashRegisterTable';
import logger from '@/lib/utils/logger';

const PAYMENT_COLORS = ['#10B981', '#3B82F6', '#8B5CF6'];

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
                {formatCompact(item.value)}
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
        <p className="text-emerald-300 font-bold text-lg">{formatCompact(item.value)}</p>
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
  const {
    period,
    startDate,
    endDate,
    data,
    loading,
    setPeriod,
    setStartDate,
    setEndDate,
    paymentPieData,
    flowBarData,
    movBarData,
    cajasBarData,
  } = useCashRegisterReport();

  const exportReport = () => {
    logger.info('Exportando reporte de caja...');
  };

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
      <CashRegisterHeader
        period={period}
        startDate={startDate}
        endDate={endDate}
        onPeriodChange={setPeriod}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onExport={exportReport}
      />

      <CashRegisterSummary summary={data.summary} />

      {/* Charts Row: Payment Distribution + Cash Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Distribution */}
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
                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-700 transition-colors shadow-xs">
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

        {/* Cash Flow */}
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
              <div className="text-center p-4 rounded-2xl bg-linear-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10 border border-green-100 dark:border-green-800/50 shadow-xs transition-transform hover:scale-105">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400 mx-auto mb-2 opacity-80" />
                <p className="text-xs text-green-600 dark:text-green-400 font-bold uppercase tracking-wider mb-1">Entradas</p>
                <p className="text-xl font-black text-green-900 dark:text-green-100">{formatCurrencyNoDecimals(data.flujoEfectivo.entradas)}</p>
              </div>
              <div className="text-center p-4 rounded-2xl bg-linear-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/10 border border-red-100 dark:border-red-800/50 shadow-xs transition-transform hover:scale-105">
                <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400 mx-auto mb-2 opacity-80" />
                <p className="text-xs text-red-600 dark:text-red-400 font-bold uppercase tracking-wider mb-1">Salidas</p>
                <p className="text-xl font-black text-red-900 dark:text-red-100">{formatCurrencyNoDecimals(data.flujoEfectivo.salidas)}</p>
              </div>
              <div className="text-center p-4 rounded-2xl bg-linear-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 border border-blue-100 dark:border-blue-800/50 shadow-xs transition-transform hover:scale-105">
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

      {/* Detailed Movements */}
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
            {/* Movement bar chart */}
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

            {/* Income/Expense details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-linear-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10 border border-green-100 dark:border-green-800/50 shadow-xs flex flex-col justify-between">
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
              <div className="p-5 rounded-2xl bg-linear-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/10 border border-red-100 dark:border-red-800/50 shadow-xs flex flex-col justify-between">
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

      {/* Cash Desk Performance Table */}
      <CashRegisterTable cajas={data.cajas} cajasBarData={cajasBarData} />
    </div>
  );
}
