'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, CalendarDays } from 'lucide-react';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useSalesReport, type SalesPeriod } from './hooks/useSalesReport';
import { SalesReportHeader } from './SalesReportHeader';
import { SalesReportStats } from './SalesReportStats';

const PAYMENT_COLORS = ['#10B981', '#3B82F6', '#8B5CF6'];

const formatNumber = (amount: number) => {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const formatCompact = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
  return `$${value}`;
};

interface PieTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { fill: string } }>;
}

const PieTooltip = ({ active, payload }: PieTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-gray-900/95 backdrop-blur-md border border-gray-700/50 rounded-xl px-4 py-3 shadow-2xl">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.payload.fill }} />
          <span className="text-white font-semibold text-sm">{data.name}</span>
        </div>
        <p className="text-emerald-300 font-bold text-lg mt-1">
          $ {formatNumber(data.value)}
        </p>
      </div>
    );
  }
  return null;
};

interface BarTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; payload: { fechaCorta: string; cantidad: number; propinas: number } }>;
}

const BarTooltip = ({ active, payload }: BarTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-gray-900/95 backdrop-blur-md border border-gray-700/50 rounded-xl px-4 py-3 shadow-2xl">
        <p className="text-white font-semibold text-sm mb-2">{data.fechaCorta}</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
            <span className="text-gray-300 text-xs">Ventas:</span>
            <span className="text-white font-bold text-sm ml-auto">$ {formatNumber(payload[0].value)}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="text-gray-300 text-xs">Propinas:</span>
            <span className="text-amber-300 font-bold text-sm ml-auto">$ {formatNumber(data.propinas)}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-gray-300 text-xs">Cantidad:</span>
            <span className="text-emerald-300 font-bold text-sm ml-auto">{data.cantidad}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function SalesReport() {
  const {
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
    exportReport,
  } = useSalesReport();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando datos de ventas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <SalesReportHeader
        period={period}
        startDate={startDate}
        endDate={endDate}
        onPeriodChange={setPeriod}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onExport={exportReport}
      />

      <SalesReportStats
        salesData={salesData}
        paymentItems={paymentItems}
        paymentTotal={paymentTotal}
        cargoTarjeta={salesData?.cargoTarjeta || 0}
      />

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Payment Methods Pie */}
        <Card className="xl:col-span-1 border-0 shadow-2xl shadow-gray-200/50 dark:shadow-black/40 rounded-3xl overflow-hidden bg-white dark:bg-gray-800/50 backdrop-blur-md">
          <CardHeader className="border-b border-gray-50 dark:border-gray-700/50 pb-4">
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                <TrendingUp className="h-4 w-4 text-violet-600" />
              </div>
              Métodos de Pago
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="h-[320px] w-full relative">
              {pieData.length > 0 ? (
                <>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</p>
                    <p className="text-2xl font-black text-gray-900 dark:text-white">
                      {formatCompact(paymentTotal)}
                    </p>
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={110}
                        paddingAngle={8}
                        strokeWidth={0}
                        animationDuration={1500}
                        animationEasing="ease-out"
                      >
                        {pieData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={PAYMENT_COLORS[index % PAYMENT_COLORS.length]}
                            style={{ filter: 'drop-shadow(0 8px 12px rgba(0,0,0,0.15))' }}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <p className="text-sm font-medium italic">Sin datos disponibles</p>
                </div>
              )}
            </div>

            <div className="mt-6 space-y-3">
              {paymentItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shadow-xs" style={{ backgroundColor: item.color }} />
                    <span className="text-sm font-bold text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                      {item.label}
                    </span>
                  </div>
                  <span className="text-sm font-black text-gray-900 dark:text-white">
                    {paymentTotal > 0 ? ((item.value / paymentTotal) * 100).toFixed(0) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Temporal Evolution Area Chart */}
        <Card className="xl:col-span-2 border-0 shadow-2xl shadow-gray-200/50 dark:shadow-black/40 rounded-3xl overflow-hidden bg-white dark:bg-gray-800/50 backdrop-blur-md">
          <CardHeader className="border-b border-gray-50 dark:border-gray-700/50 pb-4">
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <CalendarDays className="h-4 w-4 text-blue-600" />
              </div>
              Evolución Temporal
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="h-[400px] w-full">
              {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="premiumSalesAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="premiumTipsAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                      </linearGradient>
                      <filter id="shadow" height="200%">
                        <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.2"/>
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="currentColor" className="text-gray-100 dark:text-gray-700/50" vertical={false} />
                    <XAxis dataKey="fechaCorta" tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 600 }} className="text-gray-400 dark:text-gray-500" tickLine={false} axisLine={false} dy={10} />
                    <YAxis tickFormatter={formatCompact} tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 600 }} className="text-gray-400 dark:text-gray-500" tickLine={false} axisLine={false} />
                    <Tooltip content={<BarTooltip />} cursor={{ stroke: 'currentColor', strokeWidth: 1, strokeDasharray: '4 4', className: 'text-gray-300 dark:text-gray-600' }} />
                    <Legend verticalAlign="top" align="right" iconType="circle" iconSize={8} wrapperStyle={{ paddingBottom: '30px', fontSize: '12px', fontWeight: 'bold' }} />
                    <Area type="monotone" dataKey="ventas" name="Ventas Brutas" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#premiumSalesAreaGrad)" animationDuration={2000} activeDot={{ r: 6, fill: "#3B82F6", stroke: "#fff", strokeWidth: 2, style: { filter: 'url(#shadow)' } }} />
                    <Area type="monotone" dataKey="propinas" name="Propinas" stroke="#F59E0B" strokeWidth={3} fillOpacity={1} fill="url(#premiumTipsAreaGrad)" animationDuration={2500} activeDot={{ r: 6, fill: "#F59E0B", stroke: "#fff", strokeWidth: 2, style: { filter: 'url(#shadow)' } }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 italic">
                  <p className="text-sm">No se encontraron registros en este rango</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
